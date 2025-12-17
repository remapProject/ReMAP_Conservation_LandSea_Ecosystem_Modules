import { eHilucs_host } from "../config";
import Service from "./service";

const dir='registro/plannedLandUse/HilucsExt/';
const service= new Service();
export default class eHilucsService{
  async getValuesIucnActivity(activity: string){
    try {
      await service.get(`${eHilucs_host}${dir}${activity}.json`);
      
    } catch (error) {
      console.error('Error: - getValuesIucnActivity ', error);
      
    }
  }
  async getValuesIucnActivities(listActivities: string[]){
    let query=listActivities.join(',');
    try {
      let response = await service.get(`${eHilucs_host}${dir}activitiesIucn?activities=${query}.json`);
      return response;
    } catch (error) {
      console.error('Error - getValuesIucnActivities', error);
    }
  }
}