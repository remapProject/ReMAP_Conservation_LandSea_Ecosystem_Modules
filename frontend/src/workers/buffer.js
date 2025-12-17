import * as turf from "@turf/turf"
import { getActivitiesLandSea, getTableLandSea } from "../services/service";
import * as geojsonRbush from "geojson-rbush";

import { clip } from "./clip";
self.onmessage = async(event)=>{
  const {features_coastal, features_marine, area} = event.data;
  console.log('[Worker] Mensaje recibido', event.data);
  console.time('[Worker] Tiempo de ejecución');
  const res=geojsonRbush.default();

  try{
    const clip_marine =  clip(features_marine, area);
    let {Marine: list_marine, Coastal:list_coastal} =  await getActivitiesLandSea();
    let {table:table_LandSea, types_marine:table_type_marine} =  await getTableLandSea();

    let coastal = getFeaturesActivities(features_coastal, list_coastal);
    res.load({type: 'FeatureCollection',features:coastal});
    let emodnet = getFeaturesActivities(clip_marine, list_marine);
    let result=[];
    let b=[];
    for (const feature of emodnet){
      let coastal_filter_proximo= res.search(feature).features;
      for (const feature2 of coastal_filter_proximo){
        let activity_emodnet= getActivity(getHilucsMSP(feature.properties));
        let activity_coastal = getActivity(getHilucsMSP(feature2.properties));
        let values_buffer =getBuffer(activity_emodnet, activity_coastal, table_LandSea, table_type_marine);
        let {intersect, buf}=filterEmodnet(feature, feature2, values_buffer);
        if(intersect.length>0){
          result.push(...intersect);
        }
        if(buf.length>0){
          b.push(...buf);
        }
      }
    }
    console.log('Resultado',result);
    console.log('Resultado- buffer',b);
    console.log(turf.featureCollection(...result));
    console.log('[Worker] Mensaje enviado');
    console.timeEnd('[Worker] Tiempo de ejecución');
    self.postMessage({
      clip: turf.featureCollection(...clip_marine),
      result: turf.featureCollection(...result), 
      buffer:turf.featureCollection(...b)});
    
  } catch (error) {
    console.error('[Worker] Error al procesar buffer', error);
  }
}
function filterEmodnet(emodnet, coastal, values_buffer){
  let tree=geojsonRbush.default();
  let list_sud=turf.flatten(emodnet);
  // console.log('list_sud',list_sud);
  tree.load(list_sud);
  let next=tree.search(coastal).features;
  let intersect=[], buf=[];
  console.log('valores', values_buffer, emodnet, coastal);
  for (const feature of next){
    let {res, buffer}=loopBuffer(values_buffer, feature, coastal);
    intersect.push(...res); 
    buf.push(...buffer);
    // console.log('intersect',res);
  }

  return {intersect, buf};
}
function loopBuffer(list_buffer, emodnet, coastal){
  let res=[];
  let buffer=[];
  Object.entries(list_buffer).forEach(([key, type]) => {
    Object.entries(type).forEach(([keyType, value]) => {
      const numbers = value.match(/\d+/g); 
      if (numbers) {
        const bufferValue = parseInt(numbers[0], 10);
        let buffer_marine = turf.buffer(emodnet, bufferValue, { units: 'meters' });
        if(turf.booleanIntersects(buffer_marine, coastal)){
          delete coastal['bbox'];
        console.log(buffer_marine, coastal);
          let intersection = turf.intersect(turf.featureCollection([coastal, buffer_marine]));
          intersection.properties = {...emodnet.properties,...coastal.properties, type_buffer: key+'_'+keyType};
          res.push(intersection);
          console.log(intersection);
        }
        buffer.push(buffer_marine);
        console.log(`Buffer creado con valor: ${bufferValue} metros`);
        console.log(buffer_marine, coastal);
      }
    });
  });
  return {res, buffer};
}

function getBuffer(emodnet, coastal, table, table_type_marine){
  let type_marine = Object.entries(table_type_marine).find(([activity]) => {
    let cleanActivity = activity.includes('*') ? activity.split('*')[0].trim() : activity;
    return cleanActivity.includes(emodnet);
  })?.[1] ?? null;
  return table[type_marine][coastal];
}
function getFeaturesActivities(list_features, list_activities){
  let res=[];
  for (const feature of list_features){
    let hilucs=getHilucsMSP(feature.properties)
    if(feature.properties.fid ==null || feature.properties.fid == undefined) console.log(feature.properties.fid);
    let name_activity = getActivity(hilucs);
    if(!name_activity || name_activity==null) continue;
    if(flagActivity(name_activity, list_activities)){
      res.push(feature);
    }
  }
  return res;
}
function getHilucsMSP(properties){
  if (!properties) return ""; 
  const normalizedKey = Object.keys(properties).find(
    (key) => key.toLowerCase().replace(/\s+/g, "") === "hilucsmsp" 
  );
  return normalizedKey ? properties[normalizedKey] : ""; 
}
function getActivity(activity){
  if(!activity || activity==null) return "";
  let actividad =activity.split('/');
    let name=actividad[actividad.length-1];
    return  name.slice(0, name.length-5);
}
function booleanActivities(name_emodnet, name_coastal, list_emodnet, list_coastal){
  return flagActivity(name_emodnet, list_emodnet) && flagActivity(name_coastal, list_coastal);
}
function flagActivity(name_activity, list){
  let flag = false;
  name_activity=name_activity.toLowerCase();
  list.map((item)=>{
    item=item.toLowerCase();
    if(item.includes('*')){
      item = item.split('*')[0].trim();
    } 
    if(item.includes(name_activity)){
      flag=true;
    }
  })
  return flag;
}