import { Router } from 'express';
import geoserverRouter from './geoserver';
import importRouter from './files/import';
import authRouter from './auth';
import adminRouter from './admin';
import mappingLayerRouter from './Mapping/mappingLayers';
import exportRouter from './files/export';
import intersectionRouter from './intersection';

const router = Router();

router.use('/layers', geoserverRouter);
router.use('/import', importRouter);
router.use('/auth', authRouter);
router.use('/admin', adminRouter);
router.use('/process', mappingLayerRouter);
router.use('/export', exportRouter);
router.use('/intersection', intersectionRouter);

export default router;