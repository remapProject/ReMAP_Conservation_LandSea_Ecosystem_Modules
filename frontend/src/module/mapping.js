import { getMappingPartialConservation } from "@/services/service";
import { Fill, Stroke, Style } from "ol/style";

export async function mappingLayerResultsConservation(list_features){
  let features_properties=list_features.map((f_original)=>{ 
    const feature= {...f_original}
    delete feature.geom;  
    delete feature.geometry;
    delete feature.geometry_name;
    if(feature.type) delete feature.type;
    return feature;
  });
  let chunkSize = 5;
  for (let i = 0; i < features_properties.length; i += chunkSize) {
      const chunk = features_properties.slice(i, i + chunkSize);
      let response = await getMappingPartialConservation(chunk);

      response.forEach((mappedProps, j) => {
        list_features[i + j].properties = { ...mappedProps.properties };
      });
    }
  return list_features;
}
//Estilo de la capa de resultados de color
export function styleFunction(feature) {
  const value = feature.get('color');
  let color, zIndex;

  switch (value) {
    case 'conflict': 
      color = '#FF0000'; 
      zIndex = 10;
      break;
    case 'possible_conflict': 
      color = '#FFFF00'; 
      zIndex = 8;
      break;
    case 'compatibility': 
      color = '#008000'; 
      zIndex = 5;
      break;
    case 'need_further_research': 
      color = '#46BDC6'; 
      zIndex = 3;
      break;
    default:  
      color = '#808080';
      zIndex = 1;
    ;
  }

  return new Style({
    fill: new Fill({ color: `${color}` }),
    zIndex:zIndex, // transparente
    stroke: new Stroke({ color, width: 2 }),
  });
}


export function styleFunction_landsea(feature) {
  const value = feature.get('type_buffer');
  let color, zIndex;

  switch (value) {
    case 'conflict_near': 
      color = '#700000'; 
      zIndex = 10;
      break;
    case 'conflict_far': 
      color = '#FF0000'; 
      zIndex = 8;
      break;
    case 'compatibility_near': 
      color = '#007c00'; 
      zIndex = 5;
      break;
    case 'compatibility_far': 
      color = '#68c468'; 
      zIndex = 3;
      break;
    default:  
      color = '#808080';
      zIndex = 1;
    ;
  }

  return new Style({
    fill: new Fill({ color: `${color}` }),
    zIndex:zIndex, // transparente
    stroke: new Stroke({ color, width: 2 }),
  });
}