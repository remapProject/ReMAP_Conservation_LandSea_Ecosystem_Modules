import * as turf from "@turf/turf"
import { getActivitiesLandSea, getTableLandSea } from "../services/service";
import * as geojsonRbush from "geojson-rbush";

import { clip } from "./clip";
self.onmessage = async(event)=>{
  
    self.postMessage({});

}
