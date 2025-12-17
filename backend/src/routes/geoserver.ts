import GeoserverService from '../services/geoserver';
import { Router } from 'express';

const geoserverRouter = Router();
const geoserverService = new GeoserverService();
geoserverRouter.get('/', geoserverService.getLayers);
geoserverRouter.get('/styles', geoserverService.getStylesLayers);
geoserverRouter.get('/datastore/layer/:layer', geoserverService.getLayerDatastore);
geoserverRouter.get('/datastore/list_layers/:datastore/', geoserverService.getLayersDatastore);
geoserverRouter.get('/datastores/list', geoserverService.getDatastores);
geoserverRouter.get('/wfs/:layer', geoserverService.getLayerWFS);
geoserverRouter.get('/wms/:layer', geoserverService.getLayerWMS);
geoserverRouter.get('/legend/:layer', geoserverService.getLegendLayer);
geoserverRouter.post('/attributes', geoserverService.getAttributesLayer);
geoserverRouter.get('/download-shapefile/:name_layer', geoserverService.downloadShapefile);


export default geoserverRouter;