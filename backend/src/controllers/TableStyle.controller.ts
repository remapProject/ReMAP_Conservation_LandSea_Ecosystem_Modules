import GeoserverService from "../services/geoserver";
import { tableColor } from "../constants/tableColor";
import { Iucn } from "../enums/iucn";
import { SeaUseFunction } from "../enums/seausefunction";
import { Values } from "../enums/values";
import { Request, Response } from "express";
import path from "path";
import { TypeModule } from "../enums/TypeModule";

const dir_path = path.join(__dirname, '..', '..', 'files', 'mapping', 'styles');
const geoserverService = new GeoserverService();
export default class TableStyleController{
  getTable(_req: Request, res: Response) {
    res.status(200).send('Table Style');
  }
  async putFileTableStyleGeoserver(req: Request, res: Response) {
    if(!req.query.name_style || !req.query.module) return res.status(400).send('Name style is required and/or type module');
    let name_style=req.query.name_style as string;
    try {
      await geoserverService.putStyleGeoserver(name_style, name_style,dir_path, req.query.module as TypeModule);
      res.status(200).send('Table Style');      
    } catch (error) {
      console.log('Error - putFileTableStyleGeoserver', error);
      res.status(500).send("Error - putFileTableStyleGeoserver")
      
    }
  }
  getCellTableStyle(column:Iucn, row:SeaUseFunction, designation:any =  undefined, hilucsmsp:any = undefined): Values {
    let tokenDesignation = checkCorrectDesignation(designation);
    if(hilucsmsp.includes('6_OtherUses')){
       return Values.PotentialConflict;
    }else if(row === SeaUseFunction.Forbidden){ 
      return Values.Compatibility;
    }else if(!tokenDesignation && hilucsmsp.includes('3_4_7_UnderwaterCulturalHeritage')){
      return Values.Compatibility;
    } else if(!tokenDesignation && (!row.includes(SeaUseFunction.Forbidden))){
      if(hilucsmsp != undefined && checkHilucsMSP_PotentialConflict(hilucsmsp) ){
        return Values.Compatibility;
      }else{
        return Values.PotentialConflict;
      }
    } else if(column == Iucn.NotApplied || column == undefined || row == undefined ||  !Object.values(SeaUseFunction).includes(row)) {
      return Values.NotApplied;
    }else{
      const color = tableColor[column][row];
      return (color != undefined) ? color : Values.NotApplied;
    }
  }

}
function checkCorrectDesignation(designation:string){
  if(designation === undefined ||designation.includes('to be mapped'))  return false;
  switch (designation) {
  case 'Ia Strict nature reserve':
    case 'Ib Wilderness area':
    case 'II National park':
    case 'III Natural monument or feature':
    case 'IV Habitat/species management area':
    case 'V Protected seascape':
    case 'VI Protected areas with sustainable use of natural resources': 
      return true
    default:
      return false;
  }
}
function checkHilucsMSP_PotentialConflict(hilucsmsp: string){
  switch (hilucsmsp) {
    case '6_7_ProtectedArea':
    case '6_7_1_MarineProtectedArea':
    case '6_7_2_NoTakeZone':
    case '6_7_3_SpeciesCorridor':
    case '6_7_3_1_BirdsMigrationCorridor':
    case '6_7_4_EcologicalProtection':
    case '3_4_7_UnderwaterCulturalHeritage':
    case '3_4_7_1_Natural':
    case '3_4_7_2_Wreck':
    case '3_4_7_3_Archeological':
      return true;  
    default:
      return false;
  }

}