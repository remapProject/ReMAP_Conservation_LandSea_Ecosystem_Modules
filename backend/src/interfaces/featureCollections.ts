import { Feature } from "./feature";

export interface FeatureCollection {
  type: "FeatureCollection";
   features: Feature[];
}