/*
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';

import MappingLayerController from '../controllers/MappingLayer.controller';
import GeoserverService from '../services/geoserver';

const dir_path_in = path.join(__dirname, '..', '..', 'files', 'mapping', 'input');
const dir_path_out = path.join(__dirname, '..', '..', 'files', 'mapping', 'output');
export function initializeWatcher() {
   watcherInputMapping();
   watcherOutputMapping();
 }
function watcherInputMapping() {
   console.log(`👀 Observando cambios en la carpeta: ${dir_path_in}`);
   const watcher = chokidar.watch(dir_path_in, { persistent: true});
   const mappingLayerController = new MappingLayerController();
   watcher.on('add', async (filePath) => {
      const name_file = path.basename(filePath);
      const fileExtension = path.extname(name_file).toLowerCase();
      if (fileExtension === '.geojson') {
         console.log(`🆕Directory - Input: File ${name_file}`);
         try {
            await mappingLayerController.mappingLayerConservation(name_file);
         } catch (error) { 
            console.error(`Error processing file ${name_file}:`, error);
         } finally{
            if (fs.existsSync(filePath)) {
               try {
               fs.unlinkSync(filePath);
               console.log(`Archivo ${filePath} eliminado correctamente.`);
               } catch (unlinkError) {
               console.error(`Error al eliminar el archivo ${filePath}:`, unlinkError);
               }
            }
         }
      }
   });
}

function watcherOutputMapping() {
   console.log(`👀 Observando cambios en la carpeta: ${dir_path_out}`);
   const watcher = chokidar.watch(dir_path_out, { persistent: true});
   const geoserver = new GeoserverService();
   watcher.on('add', async (filePath) => {
      const name_file = path.basename(filePath);
      const fileExtension = path.extname(name_file).toLowerCase();
      if (fileExtension === '.geojson') {
         console.log(`🆕Directory - Output: File ${name_file}`);
         try {
            await geoserver.putLayerGeoserver(path.parse(name_file).name, '','', dir_path_out);
         } catch (error) { 
            console.error(`Error processing file ${name_file}:`, error);
         }finally{
            if (fs.existsSync(filePath)) {
               try {
                  fs.unlinkSync(filePath);
                  console.log(`Archivo ${name_file} eliminado correctamente.`);
               } catch (unlinkError) {
                  console.error(`Error al eliminar el archivo ${name_file}:`, unlinkError);
               }
            }
         }
      }
   });
}
*/