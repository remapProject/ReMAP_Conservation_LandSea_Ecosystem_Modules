import express from 'express';
import GeoserverService from '../services/geoserver';
import { authenticateAdmin } from '../middlewares/auth';



const geoserverService = new GeoserverService();

const adminRouter = express.Router();

adminRouter.get('/layers', authenticateAdmin, geoserverService.getLayers);

export default adminRouter;