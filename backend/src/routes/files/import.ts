import FileLoaderController from "../../controllers/FileLoader.controller";
import { Router } from "express";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage})


const importRouter = Router();
const fileLoaderController=  new FileLoaderController();
importRouter.post('/gpkg', upload.single('file'), (req, res) => {
  fileLoaderController.readFileGeopackage(req, res);
});

importRouter.post('/gpkg/:layer', upload.single('file'), (req, res) => {
  fileLoaderController.getJSON(req, res);
});
importRouter.post('/geojson/:layer', upload.single('file'), (req, res) => {
  fileLoaderController.readGeoJSON(req, res);
});
export default importRouter;