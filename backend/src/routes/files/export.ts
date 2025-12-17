import FileLoaderController from "../../controllers/FileLoader.controller";
import { Router } from "express";

const exportRouter = Router();
const fileLoaderController=  new FileLoaderController();
// exportRouter.post('/gpkg', upload.single('file'), (req, res) => {
//   fileLoaderController.readFileGeopackage(req, res);
// });

exportRouter.get('/gpkg/:layer', (req, res) => {
  fileLoaderController.getFileGeopackageGeoserver(req, res);  
});


/** Caso: Admin cuando se va a procesar las capas */
exportRouter.get('/geojson/:layer', (req, res) => {
  fileLoaderController.getFileGeoJSONGeoserver(req, res);
});
export default exportRouter;