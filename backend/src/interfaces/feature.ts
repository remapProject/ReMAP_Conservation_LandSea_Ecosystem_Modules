import { Properties } from "./properties";

export interface Feature {
  type: "Feature",
  id:string,
  properties: Properties,
  geometry: Geometry
}