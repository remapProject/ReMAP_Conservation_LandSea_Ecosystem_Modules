import { Router } from 'express';
import TableStyleController from '../../controllers/TableStyle.controller';
import MappingLayerController from '../../controllers/MappingLayer.controller';
import PropertiesController from '../../controllers/Properties.controller';
import { ecosystemServices, ecosystemServicesNames } from '../../constants/ecosystem/services';
import { habitats } from '../../constants/ecosystem/habitats';

const mappingLayerRouter = Router();
const mappingLayerController = new MappingLayerController();
const tableStyleController = new TableStyleController();
const propertiesController = new PropertiesController();
mappingLayerRouter.post('/partialIntersection', (req, res) => {
  mappingLayerController.mappingResultPartialConservation(req, res);
});
mappingLayerRouter.post('/mappingResult', (req, res) => {
  mappingLayerController.mappingResultConservationBD(req, res);
});
mappingLayerRouter.post('/intersection', (req, res) => {
  mappingLayerController.getMappingLayerIntersection(req, res);
});
mappingLayerRouter.post('/buffer', (req, res) => {
  mappingLayerController.getMappingLayerBuffer(req, res);
});
mappingLayerRouter.get('/putstyle', (req, res) => {
  tableStyleController.putFileTableStyleGeoserver(req, res);
});
mappingLayerRouter.post('/putlayer', (req, res) => {
  mappingLayerController.putLayer(req, res);
});
mappingLayerRouter.post('/style', (req, res) => {
  mappingLayerController.postStyleLayerGeoserver(req, res);
});
mappingLayerRouter.get('/getBuffer', (req, res) => {
    propertiesController.getPropertyBufferLandSea(req, res);
});
mappingLayerRouter.get('/getListActivities', (req, res) => {
  propertiesController.getListActivitiesLandSea(req, res);
});
mappingLayerRouter.get('/getTableLandSea', (req, res) => {
  propertiesController.getTablesLandSea(req, res);
});
mappingLayerRouter.get('/ecosystem/TableEcosystemService', (req, res) => {
  propertiesController.getTableEcosystemServices(req, res);
});
mappingLayerRouter.get('/ecosystem/listHabitatsByEcosystem', (req, res) => {
  propertiesController.getHabitatsByEcosystem(req, res);
});
mappingLayerRouter.get('/ecosystem/listEcosystemByHabitat', (req, res) => {
  propertiesController.getEcosystemByHabitats(req, res);
});
mappingLayerRouter.get('/ecosystem/listEcosystemServices', (_req, res) => {
  res.status(200).json({ecosystemServices, ecosystemServicesNames})
});
mappingLayerRouter.get('/ecosystem/listHabitats', (_req, res) => {
  res.status(200).json(habitats)
});
mappingLayerRouter.get('/ecosystem/layerHabitats', (req, res) => {
  mappingLayerController.mappingLayerHabitats(req, res);
});
export default mappingLayerRouter;