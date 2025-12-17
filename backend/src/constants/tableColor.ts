import { Iucn } from "../enums/iucn";
import { SeaUseFunction } from "../enums/seausefunction";
import { Values } from "../enums/values";
import { TableColor } from "../interfaces/TableColor";

export const tableColor: TableColor = {
    [Iucn.No]: {
        [SeaUseFunction.Priority]: Values.Conflict,
        [SeaUseFunction.Reserved]: Values.Conflict,
        [SeaUseFunction.Potential]: Values.Conflict,
        [SeaUseFunction.Allowed]: Values.Conflict,
        [SeaUseFunction.Restricted]: Values.Conflict,
        [SeaUseFunction.Forbidden]: Values.Compatibility
      },
      [Iucn.Variable]: {
        [SeaUseFunction.Priority]: Values.PossibleConflict,
        [SeaUseFunction.Reserved]: Values.PossibleConflict,
        [SeaUseFunction.Potential]: Values.PossibleConflict,
        [SeaUseFunction.Allowed]: Values.PossibleConflict,
        [SeaUseFunction.Restricted]: Values.PossibleConflict,
        [SeaUseFunction.Forbidden]: Values.Compatibility
      },
      [Iucn.Yes]: {
        [SeaUseFunction.Priority]: Values.Compatibility,
        [SeaUseFunction.Reserved]: Values.Compatibility,
        [SeaUseFunction.Potential]: Values.Compatibility,
        [SeaUseFunction.Allowed]: Values.Compatibility,
        [SeaUseFunction.Restricted]: Values.Compatibility,
        [SeaUseFunction.Forbidden]: Values.Compatibility
      },
      [Iucn.Yes_but]: {
        [SeaUseFunction.Priority]: Values.Compatibility,
        [SeaUseFunction.Reserved]: Values.Compatibility,
        [SeaUseFunction.Potential]: Values.Compatibility,
        [SeaUseFunction.Allowed]: Values.Compatibility,
        [SeaUseFunction.Restricted]: Values.Compatibility,
        [SeaUseFunction.Forbidden]: Values.Compatibility
      },
      [Iucn.NeedFurtherResearch]: {
        [SeaUseFunction.Priority]: Values.NeedFurtherResearch,
        [SeaUseFunction.Reserved]: Values.NeedFurtherResearch,
        [SeaUseFunction.Potential]: Values.NeedFurtherResearch,
        [SeaUseFunction.Allowed]: Values.NeedFurtherResearch,
        [SeaUseFunction.Restricted]: Values.NeedFurtherResearch,
        [SeaUseFunction.Forbidden]: Values.Compatibility
      }
    };