import { Request, Response } from "express";
import s3Service, { InputPrefix, PREFIXES } from "../services/awsS3";
import { v4 as uuidv4 } from "uuid";
import GeoserverService from "../services/geoserver";
import { GeoPackageAPI, BoundingBox } from "@ngageoint/geopackage";
import { Readable } from "stream";
import { parser } from "stream-json";
import { streamValues } from "stream-json/streamers/StreamValues";
import { TypeModule } from "../enums/TypeModule";
import PostgisService from "../services/postgis";
import { deliveryEmail } from "../services/email";
import MappingLayerController from "./MappingLayer.controller";
import path from "path";
import fs from "fs";
import os from "os";
import { Feature } from "@src/interfaces/feature";

const geoserverService = new GeoserverService();
const postgisService = new PostgisService();
const dir_path_style = path.join(__dirname, '..', '..', 'files', 'mapping', 'styles');
const dir_path_in = path.join(__dirname,"..","..","files","mapping","input");
const dir_path_out = path.join(__dirname,"..","..","files","mapping","output");

const parseGeoJSONMetadata = async (buffer: Buffer): Promise<{ crs: any; firstFeature: any }> => {
  return new Promise((resolve, reject) => {
    const pipeline = Readable.from(buffer).pipe(parser()).pipe(streamValues());
    let crs: any = null;
    let firstFeature: any = null;

    pipeline.on("data", (data: any) => {
      if (data.value?.crs) crs = data.value.crs;
      if (data.value?.features?.[0]) {
        firstFeature = data.value.features[0];
        pipeline.destroy();
        resolve({ crs, firstFeature });
      }
    });

    pipeline.on("error", reject);
    pipeline.on("end", () => {
      if (!firstFeature) reject(new Error("No features found"));
    });
  });
};

export const fullIntersection = async (req: Request, res: Response) => {
  try {
    const { 
      admin, 
      email, 
      moduleName = TypeModule.msp,
      nameOutputOption,
      styleOption
     } = req.body;
    const files = req.files as { [key: string]: Express.Multer.File[] };

    if (!admin && !email) {
      res.status(400).json({ error: "Email requerido para usuarios no admin" });
      return;
    }

    const getLayer = async (field: string) => {
      let layerData: any, totalFeatures:number=0;
      if (files?.[field]?.[0]) {
        const file = files[field][0];
        const fileExtension = file.originalname.split(".").pop()?.toLowerCase();

        if (fileExtension === "gpkg") {
          // **Si es GeoPackage, procesarlo primero**
          layerData = await readFileGeopackage(file.buffer);
          return {
            name: file.originalname,
            data: layerData,
            buffer: null,
          };
        } else {
          // **Si es GeoJSON, procesarlo normalmente**
          const { crs, firstFeature } = await parseGeoJSONMetadata(file.buffer);
          return {
            name: file.originalname,
            data: { crs, features: [firstFeature] },
            buffer: file.buffer,
          };
        }
      }
      if (req.body[field]) {
        const layerName = req.body[field];
         // Crea un fichero temporal
        const tempFilePath = path.join(os.tmpdir(), `${layerName}_${Date.now()}.geojson`);
        const writeStream = fs.createWriteStream(tempFilePath);

        // Escribe el inicio del FeatureCollection
        writeStream.write('{"type":"FeatureCollection","features":[');


        // const datastore = await getLayerDatastoreFromGeoserver(layerName);
        // layerData = await geoserverService.fetchLayerData(layerName, datastore);
        let first=true;
        let firstFeature:any;
        let name=await geoserverService.getLayerFeatureTypes(layerName);
        for await (const data of postgisService.getLayerGeoJSON(name.featureType?.nativeName)) {
          for (const feature of data.features) {
            if(first) firstFeature = feature as Feature;
            if (!first) writeStream.write(',');
            writeStream.write(JSON.stringify(feature));
            first = false;
            totalFeatures++;
            // totalFeatures += data.features.length;
            // layerData.features.push(...data.features);
          }
          console.log(`🚀 Agregados ${data.features.length} features. Total: ${totalFeatures}`);
        }
        
        // Escribe el final del FeatureCollection
        writeStream.write(']}');
        writeStream.end();

        // Espera a que termine de escribir
        await new Promise<void>((resolve) => {
          writeStream.on("finish", () => resolve());
        });

        // Lee el buffer del fichero
        const buffer = fs.readFileSync(tempFilePath);
        return {
          name: layerName,
          data: { features:[firstFeature]},
          buffer
        };
      }
      return null;
    };

    const validateLayer = (layer: any,isLayer1: boolean,moduleName: TypeModule) => {
      if (!layer) return;

      // 1. Validar sistema de referencia
      console.log('capaita',layer, isLayer1)
      const crs = layer.data.crs?.properties?.name || "EPSG::4326";
      if (!crs.includes("EPSG::4326")) {
        console.error(
          `Layer ${layer.name} must use WGS84 (EPSG:4326) coordinate system. Found: ${crs}`
        );
        return false;
      }

      // 2. Validar campos requeridos
      const normalizeKeys =(obj: Record <string, any>): Record<string, any> => {
        const normalized:Record<string, any> = {};
        for (const key in obj) {
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
          normalized[normalizedKey] = obj[key];
        }
        return normalized;
      };
      const firstFeature = normalizeKeys(layer.data.features?.[0]?.properties || {})
     
      let requiredFields: string[];
      console.log('module name en validacion', moduleName)
      if (moduleName === TypeModule.lsi) {
        requiredFields = ["fid", "hilucsmsp"]; // Ambos layers requieren estos campos
      } else {
        requiredFields = isLayer1
          ? ["fid", "seausefct", "hilucsmsp"] // Modulo MSP: layer1
          : ["fid", "designation"]; // Modulo MPA: layer2
      }

      const missingFields = requiredFields.filter((f) => !(f.toLowerCase().replace(/\s+/g, '') in firstFeature));

      if (missingFields.length > 0) {
        console.error(
          `Layer ${layer.name} is missing required fields: ${missingFields.join(
            ", "
          )}`
        );
        return false;
      }
      return true;
    };

    const layer1 = await getLayer("layer1");
    const layer2 = await getLayer("layer2");

    if (!layer1 || !layer2) {
      res.status(400).json({ error: "Both layers are required" });
      return;
    }

    const processLayerName = (originalName: string) => {
      const parts = originalName.split(".");
      // Quitar la última parte si hay más de una
      if (parts.length > 1) parts.pop();
      // Volver a unir con puntos
      let name = parts.join(".");
      // Eliminar espacios
      name = name.replace(/\s+/g, "");
      // Reemplazar caracteres no alfanuméricos por "_"
      name = name.replace(/[^a-zA-Z0-9]/g, "_");
      return name;
    };

    const name1 = processLayerName(layer1.name);
    const name2 = processLayerName(layer2.name);
    const outputName = (!nameOutputOption)?`${name1}_${name2}_${Date.now()}.geojson`: nameOutputOption;
    console.log('bien capas', name1, name2, outputName)
    // const existing = await postgisService.checkExistingLayers(name1, name2);
    // if (existing) {
    //   res.status(400).json({
    //     error: "This intersection of layers already exists",
    //     output: outputName,
    //   });
    //   return;
    // }
    const l1val = validateLayer(layer1, true, moduleName as TypeModule);
    const l2val = validateLayer(layer2, false, moduleName as TypeModule);

    if (!l1val || !l2val) {
    console.log('algo paso',l1val,l2val)
      res.status(400).json({ error: "The layers do not meet the requirements" });
      return;
    }
    console.log('ya paso val')
    const processData = {
      id: uuidv4(),
      admin: Boolean(admin),
      email: admin ? null : email,
      layer1: name1,
      layer2: name2,
      output: outputName,
      timeLink: new Date(Date.now()).toISOString(),
      moduleName: moduleName as TypeModule,
      nameStyle: styleOption || null,
    };

    const uploadToS3 = async (layer: any,prefix: InputPrefix,layerKey: "layer1" | "layer2") => {
      try {
        console.log('estoy en upload')
        const geoJsonBuffer =
          layer.buffer ?? Buffer.from(JSON.stringify(layer.data));
        const filename = `${layerKey}_${layer.name}.geojson`;

        await s3Service.uploadFileToInput({
          fileBuffer: geoJsonBuffer,
          prefix: prefix,
          hash: processData.id,
          filename: filename,
        });
        console.log('termine upload')
        return filename;
      } catch (error) {
        console.error(`Error uploading ${layer.name} to S3:`, error);
        throw new Error("Error uploading files to S3");
      }
    };

    const prefixMap = {
      [TypeModule.msp]: PREFIXES.CONSERVATION,
      [TypeModule.lsi]: PREFIXES.LANDSEA,
      [TypeModule.es]: PREFIXES.ECOSYSTEM_SERVICE,
    };

    const prefix = prefixMap[processData.moduleName] || PREFIXES.CONSERVATION;
    console.log('que se sube',prefix, processData)
    await uploadToS3(layer1, prefix, "layer1");
    await uploadToS3(layer2, prefix, "layer2");

    await postgisService.createDownloadUser(
      processData.id,
      processData.admin,
      processData.email,
      processData.layer1,
      processData.layer2,
      processData.output,
      false,
      null,
      processData.timeLink,
      processData.moduleName, 
      processData.nameStyle
    );
    console.log('voy por aquí apuntito de terminar')
    res.json({
      id: processData.id,
      success: true,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
export const webhookIntersection = async (req: Request, res: Response) => {
  const deleteFilesS3 = async (hash: string, userRecord: any) => {
    await s3Service.deleteInputFiles({
      prefix: userRecord.moduleName,
      hash: hash
    });
    
    await s3Service.deleteOutputFiles({
      hash: hash
    });
  };
  const deleteUnsyncfile = (filePath: string) => {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Archivo ${filePath} eliminado correctamente.`);
      } catch (err) {
        console.error(`Error file: ${filePath}`);
        console.error("Error deleting local files:", err);
      }
    }
  };
  const generateFile=async (fileName: string, userRecord:any)=>{
    const hashId = userRecord.id;
    const fileStream = await s3Service.downloadOutputFile({
      hash: hashId,
      filename: fileName,
    });
    
    const fileBuffer = await streamToBuffer(fileStream);
      console.log('que hay en file buffer', fileBuffer)
    //2. Guardar en el directorio vigilado por el watcher
    const inputFilePath = path.join(dir_path_in, userRecord.name_file);
    fs.writeFileSync(inputFilePath, fileBuffer);
    console.log('ya guarde el archivo con el path', inputFilePath)
    //3. Procesar el archivo segun el modulo
  }
  try {
    const { name, error } = req.query;
    console.log("Received webhook:", name, error);
    if (!name && !error) {
      res.status(400).json({ error: "Must provide name or error" });
      return;
    }
    if (name && error) {
      res.status(400).json({ error: "There can only be name or error, not both" });
      return;
    }

    const fullName = name ? String(name) : String(error);
    const firstUnderscoreIndex = fullName.indexOf("_");
    console.log('2-  nombre full name', fullName, firstUnderscoreIndex)
    if (firstUnderscoreIndex === -1) {
      res.status(400).json({ error: "Invalid name format or error" });
      return;
    }
    const path_fullName=fullName.split('/')
    const hash = path_fullName[0];
    const fileName = fullName.substring(firstUnderscoreIndex + 1);
    const baseName = path.parse(fileName).name;

    const userRecord = await postgisService.getDownloadUserById(hash);
    console.log('hash:  ', hash, 'fihle----', fileName, userRecord)
    if (!userRecord) {
      res.status(404).json({ error: "No record found" });
      return;
    }

    if (name) {
      await postgisService.updateDownloadUser(hash, {
        finished: true,
      });
      console.log('pase por aqui')
      const mappingController = new MappingLayerController();
      let list_files_output = generateNumberedFilenames(path_fullName[1]);
      console.log('lista de archivos de salida', list_files_output)
      if (userRecord.admin) {
        try {
          for await (const file_output of list_files_output) {
            await generateFile(file_output, userRecord);
          }
          const geoserver = new GeoserverService();
          console.log('antes del if, voy a mappear', userRecord.moduleName)
          if (userRecord.moduleName == TypeModule.msp) {
            let name_style="conservation_iucn";
            let file_output=await mappingController.mappingLayerConservation(userRecord.name_file ? path.parse(userRecord.name_file).name : baseName);

            await geoserver.putLayerGeoserver(
              path.parse(userRecord.name_file).name,
              file_output,
              name_style,
              name_style,
              dir_path_out,
              TypeModule.msp
            );
            if(!(await geoserver.checkExistStyle(name_style))){
              await geoserver.putStyleGeoserver(name_style, name_style,dir_path_style, req.query.module as TypeModule);
            }
            if(userRecord.name_style){
              await geoserver.putStyleGeoserver(
                userRecord.name_style, 
                userRecord.name_style,
                dir_path_style, 
                userRecord.moduleName as TypeModule
              );
            }
            await geoserver.setStyleLayerGeoserver(file_output.split('.')[0], name_style);
            console.log('despues del mappeo y geioserver')
          } else if (userRecord.moduleName == TypeModule.lsi) {
            let name_style="landsea";
            await geoserver.putLayerGeoserver(
              baseName,
              userRecord.name_file ? path.parse(userRecord.name_file).name : baseName,
              name_style,
              name_style,
              dir_path_out,
              TypeModule.lsi
            );
            if(!(await geoserver.checkExistStyle(name_style))){
              await geoserver.putStyleGeoserver(name_style, name_style,dir_path_style, req.query.module as TypeModule);
            }
            if(userRecord.name_style){
              await geoserver.putStyleGeoserver(
                userRecord.name_style, 
                userRecord.name_style,
                dir_path_style, 
                userRecord.moduleName as TypeModule
              );
            }
            await geoserver.setStyleLayerGeoserver(userRecord.name_file, name_style);
          }
          deleteUnsyncfile(path.join(dir_path_in, fileName));
          deleteUnsyncfile(path.join(dir_path_out, fileName));
        } catch (err) {
          console.error("Error processing admin files:", err);
          
        } finally{
          console.log('elimnado temporales entrada y salida de s3')
          //4. Eliminar archivos temporales de S3
        
          await deleteFilesS3(hash, userRecord);
        }
      } else if (!userRecord.admin && userRecord.user_email) {
        console.log('voy a procesar no admin')
        try {
          // const outputFilename = fileName;
          for await (const file_output of list_files_output) {
            await generateFile(file_output, userRecord);
          }
          let presignedUrl: string;
         if (userRecord.moduleName === TypeModule.msp) {
          let file_output=await mappingController.mappingLayerConservation(baseName);
          const buffer_file_output = await streamToBuffer(fs.createReadStream(file_output));
          presignedUrl = await s3Service.uploadAndGetShareableUrl({
            fileBuffer: buffer_file_output,
            filename: `${userRecord.name_file}`,
          });
         } else{
          const buffer_file_output = await streamToBuffer(fs.createReadStream(userRecord.name_file));
          presignedUrl = await s3Service.uploadAndGetShareableUrl({
            fileBuffer: buffer_file_output,
            filename: `${userRecord.name_file}`,
          });

         }

          const emailSubject = "Your ReMAP offline Geoprocessing Analysis are ready!";
          const emailBody = `
                <h1>ReMAP Geoprocessing Complete</h1>
                <p>Download link: <a href="${presignedUrl}">${presignedUrl}</a></p>
                <p>Expires in 7 days</p>
              `;
          await deliveryEmail(userRecord.user_email, emailSubject, emailBody);
          deleteFilesS3(userRecord.id,userRecord);
        } catch (err) {
          console.error("Error processing no-admin:", err);
        } finally{
          await deleteFilesS3(hash, userRecord);
        }
      }
    } else if (error) {
      await postgisService.updateDownloadUser(hash, {
        error: fullName,
        finished: false,
      });
    }

    res.json({
      success: true,
      message: `Correctly updated register (${name ? "name" : "error"})`,
    });
    return;
  } catch (error) {
    console.error("Error in /intersection/webhook:", error);
    res.status(500).json({ error: "Internal server error" });

    return;
  }
};

const streamToBuffer = (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
};

async function readFileGeopackage(fileBuffer: Buffer) {
  try {
    const geopackage = await GeoPackageAPI.open(fileBuffer);
    const featureTables = geopackage.getFeatureTables();

    if (!featureTables.length) {
      throw new Error("No feature tables found in the GeoPackage.");
    }

    const tableName = featureTables[0];
    const boundingBox = new BoundingBox(-180, 180, -90, 90);
    const geojsonFeatures = geopackage.queryForGeoJSONFeaturesInTable(
      tableName,
      boundingBox
    );
    return {
      type: "FeatureCollection",
      features: geojsonFeatures,
    };
  } catch (error) {
    console.error("Error opening GeoPackage:", error);
    throw new Error("Error processing GeoPackage file.");
  }
}

function generateNumberedFilenames(filename: string, start = 1, includeZero = false): string[] {
  const m = filename.match(/^(.*)_(\d+)(\.[^.]+)$/);
  if (!m) return [filename]; // no tiene sufijo numérico final

  const base = m[1];
  const numStr = m[2];
  const ext = m[3];
  const pad = numStr.length;
  const n = parseInt(numStr, 10);
  const from = includeZero ? 0 : start;
  const list: string[] = [];

  for (let i = from; i <= n; i++) {
    const idx = String(i).padStart(pad, '0');
    list.push(`${base}_${idx}${ext}`);
  }

  return list;
}
