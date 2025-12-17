import  ListActivitiesMarine from './ListActivitiesMarine.json'
import  CoastalLandUse from './CoastalLandUse.json'
export const tableLandSea = CoastalLandUse as any;
export const ActivitiesLand = Object.keys(CoastalLandUse.Aquaculture);
export const ActivitiesMarine = ListActivitiesMarine as any;