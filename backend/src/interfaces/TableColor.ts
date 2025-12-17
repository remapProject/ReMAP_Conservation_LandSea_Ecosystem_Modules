import { Iucn } from "../enums/iucn";
import { SeaUseFunction } from "../enums/seausefunction";
import { Values } from "../enums/values";

export type TableColor = {
  [key in  Exclude<Iucn, Iucn.NotApplied>]: {
    [key in SeaUseFunction]: Values;
  };
}