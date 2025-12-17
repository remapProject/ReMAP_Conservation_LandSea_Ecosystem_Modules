import { Values_Lsi } from "../enums/lsi/valuesLsi";
import { SeaUseFunction } from "../enums/seausefunction";
import { Values } from "../enums/values";

export interface Properties {
  color?: Values,
  type_buffer?: Values_Lsi,
  seausefct:SeaUseFunction,
  hilucsmsp:string,
  designation:string,
  [key: string]: any
}