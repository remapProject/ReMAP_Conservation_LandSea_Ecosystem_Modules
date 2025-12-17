import { GeoPackageAPI, BoundingBox } from "@ngageoint/geopackage";
import { Request, Response } from "express";

import path from "path";
import fs from 'fs';
import GeoserverService from "../services/geoserver";
import PostgisService from "../services/postgis";
const dir_path_in = path.join(__dirname, '..', '..', 'files', 'download');
const geoserver = new GeoserverService();
const postgis = new PostgisService();
export default class FileLoaderController{

  async readFileGeopackage(req:Request, res:Response){
    if (!req.file) return res.status(400).send('No file uploaded');
    try {
      const file = req.file.buffer;
      const geopackage = await GeoPackageAPI.open(file);
      const featuresTables = await geopackage.getFeatureTables();
      return res.status(200).json({featuresTables});
    } catch (error) {
      console.error('Error open Geopackage', error);
      return res.status(500).send("Error processing File Geopackage")
    }

  }
  async getJSON(req:Request, res:Response){
    if (!req.file) return res.status(400).send('No file uploaded');
    try {
      const file = req.file.buffer;
      const geopackage = await GeoPackageAPI.open(file);
      let features: any[] = [];
   
      const boundingBox = new BoundingBox(-180, 180, -90, 90);
      //console.log(file, geopackage, req.params.layer);
      const feature = await geopackage.queryForGeoJSONFeaturesInTable(req.params.layer, boundingBox);
      //console.log(feature);
      features.push(...feature);

      return res.status(200).json({
        type: 'FeatureCollection',
        features: features
      });
    } catch (error) {
      console.error('Error reading Geopackage', error);
      return res.status(500).send("Error reading File Geopackage")
    }
  }
  async readGeoJSON(req: Request, res: Response) {
    if (!req.file) return res.status(400).send('No file uploaded');
    try {
      const file = req.file.buffer.toString('utf-8');
      const geojson = JSON.parse(file);
  
      // Validar que el archivo sea un GeoJSON válido
      if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
        return res.status(400).send('Invalid GeoJSON file');
      }
  
      return res.status(200).json(geojson);
    } catch (error) {
      console.error('Error reading GeoJSON', error);
      return res.status(500).send("Error processing GeoJSON file");
    }
  }
  async getFileGeoJSONGeoserver(req: Request, res: Response) {
    if(!req.params.layer) return res.status(400).send('File is required');
    let file = req.params.layer  as string;
    try {
      const response = await geoserver.getLayerWFS(req, res);
      const filePath = path.join(dir_path_in, `${file}.geojson`);
      await fs.writeFileSync(filePath, JSON.stringify(response));
      if (!fs.existsSync(filePath)) {
        console.error("Error: El archivo no se encontró.");
        return res.status(500).send("Error: El archivo no está disponible.");
      }
  
      res.download(filePath,`${file}.geojson`, (err) => {
        if (err) {
          console.error("Error al enviar el archivo:", err);
  
          if (!res.headersSent) {
            res.status(500).send("Error al descargar el archivo");
          }
        }  
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error("Error al eliminar el archivo:", unlinkErr);
        });
      });
  
      req.on("aborted", () => {
        console.warn(" El cliente canceló la descarga.");
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

    } catch (error) {
      console.error('Error download GeoJSON file', error);
      return res.status(500).send("Error download GeoJSON file")
    }
  }
  async getFileGeopackageGeoserver(req: Request, res: Response) {
    if(!req.params.layer) return res.status(400).send('File is required');
    let file = req.params.layer  as string;
    const filePath = path.join(dir_path_in, `${file}.gpkg`);
    let geopackage; 
    try {
      let response = await geoserver.getLayerFeatureTypes(file);
      let nameTableLayer=response.featureType?.nativeName;
      if (!fs.existsSync(filePath)) {
        geopackage=await GeoPackageAPI.create(filePath);
      }else{ 
        geopackage = await GeoPackageAPI.open(filePath);
      }
      const tableName=file;
      let totalFeatures = 0,tokenCreated=false, hasData=false;

      for await (const data of postgis.getLayerGeoJSON(nameTableLayer)) {
        if(!tokenCreated){
          hasData=true;
          let propertyColumns = Object.entries(data.features[0].properties).map(([key, value]) => {
            let type = 'TEXT';
            if (typeof value === "number" && !key.includes('fid')) type = "INTEGER";
            else if (typeof value === "boolean") type = 'BOOLEAN';
            return { name: key, dataType: type };
          });
          // console.log("Columnas inferidas:", propertyColumns);
          propertyColumns.shift();
          propertyColumns = propertyColumns.filter(col => 
            !col.name.includes('id')&&!col.name.includes('fid') && !col.name.includes('path')&& !col.name.includes('layer')
          ) ;
          geopackage.createFeatureTableFromProperties(tableName, propertyColumns);
          tokenCreated = true;
        }
        await geopackage.addGeoJSONFeaturesToGeoPackage( data.features, tableName);
        totalFeatures += data.features.length;
        console.log(`🚀 Agregados ${data.features.length} features. Total: ${totalFeatures}`);
      }
      if (!hasData) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return res.status(404).send("No se encontraron datos para la capa solicitada.");
      }
      if (!fs.existsSync(filePath)) {
        console.error("Error: El archivo no se encontró.");
        return res.status(500).send("Error: El archivo no está disponible.");
      }
  
      res.download(filePath,`${file}.gpkg`, (err) => {
        if (err) {
          console.error("Error al enviar el archivo:", err);
  
          if (!res.headersSent) {
            res.status(500).send("Error al descargar el archivo");
          }
        }  
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error("Error al eliminar el archivo:", unlinkErr);
        });
      });
  
      req.on("aborted", () => {
        console.warn(" El cliente canceló la descarga.");
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    await geopackage.close();  
  } catch (error) {
      await geopackage?.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      console.error('Error download Geopackage file', error);
      res.status(500).send("Error al descargar el archivo");
    }
  }
}