import * as turf from "@turf/turf"
import { intersection } from 'martinez-polygon-clipping';
export function clip(features, area){
  const areaCoords = area.geometry.coordinates;
  const clip = [];
  // Asegurarse que el área es un solo polígono
  turf.flattenEach(area, (simpleArea) => {
    for (const feature of features) {
      turf.flattenEach(feature, (simpleFeature) => {
        const featureCoords = simpleFeature.geometry.coordinates;

        const clipped = intersection(areaCoords, featureCoords);

        if (clipped) {
          let clippedFeature;
          if (clipped.length === 1) {
            clippedFeature = turf.polygon(clipped[0]);
          } else {
            clippedFeature = turf.multiPolygon(clipped);
          }
          clippedFeature.properties = { ...feature.properties }; 
          clip.push(clippedFeature);
        }
      });
    }
  })
  return turf.featureCollection(clip);
}