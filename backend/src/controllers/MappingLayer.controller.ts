import { Request, Response } from "express";
import PropertiesController from "./Properties.controller";
import GeoserverService from '../services/geoserver';

import path from "path";
import fs from 'fs';
import PostgisService from "../services/postgis";
import { TypeTotalEcosystemService } from "../enums/es/typeTotalEcosystemService";
import { TypeModule } from "../enums/TypeModule";

const dir_path_in = path.join(__dirname, '..', '..', 'files', 'mapping', 'input');
const dir_path_out = path.join(__dirname, '..', '..', 'files', 'mapping', 'output');
const dir_path_style = path.join(__dirname, '..', '..', 'files', 'mapping', 'styles');
const propertiesController= new PropertiesController();
const geoserver = new GeoserverService();
const postgis = new PostgisService();

export default class MappingLayerController{
  async mappingResultPartialConservation(req:Request, res:Response){
    if(!req.body.features_properties) return res.status(400).send('Features properties is required');
    try {
    let properties= await propertiesController.getProperties(req.body.features_properties);
    return res.status(200).json(properties);
    } catch (error) {
      console.error('Error - mappingResultPartialConservation', error);
      return res.status(500).send("Error - mappingResultPartialConservation")
    } 
  }
  async mappingResultConservationBD(req:Request, res:Response){
    if(!req.query.name_layer || !req.query.module) return res.status(400).send('name_layer of DB and/or module is required');
    let name_layer=req.query.name_layer as string,
    module: TypeModule=req.query.module as TypeModule || TypeModule.msp;
    try {
      if(module === TypeModule.msp){
        await propertiesController.getPropertiesByLayer(name_layer, module as TypeModule,req.query.attribute as string || 'color');
        return res.status(200).send('Update properties success');
      }
      return res.status(400).send('Module not valid');
    } catch (error) {
      console.error('Error - mappingResultConservationBD', error);
      return res.status(500).send("Error - mappingResultConservationBD")
    }
  }

  async mappingLayerConservation(file: string, date: string=getNowDate()): Promise<string>{
    try {      
      const data= fs.readFileSync(path.join(dir_path_in,file), 'utf8');
      const data_json=JSON.parse(data)
      data_json.features= await propertiesController.getProperties(data_json.features);
      file =file.split('.')[0];
      file = file.replace(/_\d+$/, "");
      fs.writeFileSync(path.join(dir_path_out, `${file}_${date}.geojson`), JSON.stringify(data_json));
      return `${file}_${date}.geojson`;
    } catch (error) {
      throw new Error(`Error - mappingLayerConservation - ${error}`);
    }
  }
  // Mapea la capa y la sube a geoserver mediante petición sin web hooks
  async getMappingLayerIntersection(req: Request, res: Response) {
    if(!req.query.file_name) return res.status(400).send('File is required');
    let file = req.query.file_name as string;
    let list_files=(file.includes(','))?
      file.split(',')
      : 
      (req.query.token)?
      fs.readdirSync(path.join(dir_path_in))
      .filter(f => f.startsWith(file))
      : 
      [file];
    if(list_files.length>1){ //multiple files
        let date=getNowDate();
      for(let i =0; i< list_files.length; i++){
        const file = list_files[i];
        if(!validateFormatFile(file)) return res.status(400).send(`Format file ${file} is not valid`);
        console.log('🔨 mapping -> file: ', file);
        let file_output=await this.mappingLayerConservation(file, date);
        if(req.query.auth && req.query.name_style){ 
          if(i ==0){ //Creación de la capa principal y estilos en geoserver
            try {
              await geoserver.putLayerGeoserver(
                file_output.split('.')[0], file_output.split('.')[0], 
                req.query.name_style as string, req.query.name_style as string,
                dir_path_out,  TypeModule.msp);
              let name_style=req.query.name_style as string;
              if(!(await geoserver.checkExistStyle(name_style))){
                await geoserver.putStyleGeoserver(name_style, name_style,dir_path_style, req.query.module as TypeModule);
              }
              await geoserver.setStyleLayerGeoserver(file_output.split('.')[0], name_style);
            } catch (error) {
              console.error('Error al mapping layer', error);
              return res.status(500).send("Error mapping layer")
            } finally{
              deleteOutputFile(file_output);
            }
          }else{
            try {
              await geoserver.putLayerGeoserver(file_output, file_output, req.query.name_style as string,
                 req.query.name_style as string, 
                 dir_path_out, TypeModule.msp,true);
            } catch (error) {
              console.error('Error al upload layer', error);
              return res.status(500).send("Error mapping layer")
            }
          }
          deleteOutputFile(file_output);
          deleteInputFile(file);
          
        }
      }
    }else{
      if(validateFormatFile(file)){
        try {
          let output_file=await this.mappingLayerConservation(file);
          if(req.query.auth && req.query.name_style){
            await geoserver.putLayerGeoserver( 
              output_file.split('.')[0], output_file.split('.')[0], 
              req.query.name_style as string, req.query.name_style as string, 
              dir_path_out);
            let name_style=req.query.name_style as string;
            if(!(await geoserver.checkExistStyle(name_style))){
            await geoserver.putStyleGeoserver(name_style, name_style,dir_path_style, req.query.module as TypeModule);
            }
            await geoserver.setStyleLayerGeoserver((await output_file).split('.')[0], name_style);
          }
          return res.status(200).send('Mapping layer success');
        } catch (error) {
          console.error('Error al mapping layer', error);
          return res.status(500).send("Error mapping layer")
        } finally{
          deleteOutputFile(file);
        }
      }else{
        return res.status(400).send('Format file is not valid');
      }
    }
  }
  async getMappingLayerBuffer(req: Request, res: Response) {
    if(!req.query.file_name && req.query.name_style) return res.status(400).send('File and/or name_style is required');
    let file = req.query.file_name as string;

    if(validateFormatFile(file)){
      try {
        if(req.query.auth && req.query.name_style){
          await geoserver.putLayerGeoserver(file, file, req.query.name_style as string, req.query.name_style as string, dir_path_in);
          let name_style=req.query.name_style as string;
          if(!(await geoserver.checkExistStyle(name_style))){
          await geoserver.putStyleGeoserver(name_style, name_style,dir_path_style, req.query.module as TypeModule);
          }
          await geoserver.setStyleLayerGeoserver(file.split('.')[0], name_style);
        }
        return res.status(200).send('Mapping layer success');
      } catch (error) {
        console.error('Error al mapping layer buffer', error);
        return res.status(500).send("Error mapping layer buffer")
      }
    }else{
      return res.status(400).send('Format file is not valid');
    }
  }
  async putLayer(req: Request, res: Response) {
    try {
      await geoserver.putLayerGeoserver(
        req.query.name_layer as string , 
        req.query.name_layer as string ,
        req.query.name_style as string, req.query.name_style as string, 
        dir_path_out
      );
      return res.status(200).send('Layer created'); 
    } catch (error) {
      return res.status(500).send("Error - putLayer")
    }
  }
  async postStyleLayerGeoserver(req: Request, res: Response) {
    if(!req.query.name_style || !req.query.name_layer) return res.status(400).send('Name style is required');
    let name_style=req.query.name_style as string,
    name_layer=req.query.name_layer as string;
    try {
      await geoserver.setStyleLayerGeoserver(name_layer, name_style);
      return res.status(200).send('Table Style');      
    } catch (error) {
      console.log('Error - putStyleLayerGeoserver', error);
      return res.status(500).send("Error - putStyleLayerGeoserver")
    }
  }
  async mappingLayerHabitats(_req: Request, res: Response) {
    let list_sum_habitats= propertiesController.getListHabitatsSumByEcosystem();
    try{
      if (Object.keys(list_sum_habitats).length === 0) return res.status(404).send('No habitats found');
      await postgis.updateLayerHabitats(list_sum_habitats, 'Ecosystem service_16_06_2025');
      await geoserver.putStyleGeoserver(
        'Scale-Total-ES', 'Scale-Total-ES', dir_path_style, 
        TypeModule.es, TypeTotalEcosystemService.total
      );
      await geoserver.putStyleGeoserver(
        'Scale-Provisioning-ES', 'Scale-Provisioning-ES', dir_path_style, 
        TypeModule.es, TypeTotalEcosystemService.provisioning
      );
      await geoserver.putStyleGeoserver(
        'Scale-Regulation-ES', 'Scale-Regulation-ES', dir_path_style, 
        TypeModule.es, TypeTotalEcosystemService.regulation
      );
      await geoserver.putStyleGeoserver(
        'Scale-Cultural-ES', 'Scale-Cultural-ES', dir_path_style, 
        TypeModule.es, TypeTotalEcosystemService.cultural
      );
      await geoserver.setStyleLayerGeoserver('Ecosystem service_16_06_2025', 'Scale-Total-ES', 
        ['Scale-Provisioning-ES', 'Scale-Regulation-ES', 'Scale-Cultural-ES']
      );
      return res.status(200).send('Habitats layer updated');
    } catch(error) {
      console.error('Error - mappingLayerHabitats', error);
      return res.status(500).send('Error processing habitats layer');
    }
  }
}

function validateFormatFile(file: string){
  const format = file.split('.')[1];
  if(format !== 'geojson'){
    return false;
  }
  return true;
}

function getNowDate(){
  const now = new Date();
  let full_date = new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  return `${full_date[4].value}_${full_date[2].value}_${full_date[0].value}_${full_date[6].value}_${full_date[8].value}`;

  
}

function deleteOutputFile(file_output:string){
  if (fs.existsSync(file_output)) {
    try {
      fs.unlinkSync(path.join(dir_path_out, file_output));
      console.log(`Archivo ${file_output} eliminado correctamente.`);
    } catch (unlinkError) {
      console.error(`Error al eliminar el archivo ${file_output}:`, unlinkError);
    }
  }
}
function deleteInputFile(file_output:string){
  if (fs.existsSync(file_output)) {
    try {
      fs.unlinkSync(path.join(dir_path_in, file_output));
      console.log(`Archivo ${file_output} eliminado correctamente.`);
    } catch (unlinkError) {
      console.error(`Error al eliminar el archivo ${file_output}:`, unlinkError);
    }
  }
}