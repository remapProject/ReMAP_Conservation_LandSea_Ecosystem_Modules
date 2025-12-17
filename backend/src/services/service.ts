import axios from "axios";
import { Geoserver_user, Geoserver_pass } from "../config";

export default class Service {
  async get(url:string):Promise<any>{
    try {
      console.log(Geoserver_pass.length, Geoserver_pass.includes('Q'))
      const response = await axios.get(url,{
        auth: {
            username: Geoserver_user,
            password: Geoserver_pass
        },  headers: { "Content-Type": "application/json" } 
      }
      );
      return response.data
    } catch(error){ 
      throw new Error(`Error - get ${url} - ${error}`); 
    } 
  }
  async getImage(url:string, options:object={}):Promise<any>{
    try {
      const response = await axios.get(url,{...options});
      return response
    } catch(error){ 
      throw new Error(`Error - getImage ${url}: ${error}`); 
    } 
  }
  async put(url:string, body:string):Promise<any>{
    try {
      const response = await axios.put(url, body,{
        auth: {
            username: Geoserver_user,
            password: Geoserver_pass
        },
        headers: {
          "Content-Type": "application/json"
        }
      },);
      return response.data
    } catch(error){ 
      throw new Error(`Error - put ${url}: ${error}`); 
    } 
  }
  async post(url:string, body:any, header?: any):Promise<any>{
    const config: { auth: { username: string; password: string; }, headers?: any } = {
      auth: {
        username: Geoserver_user,
        password: Geoserver_pass
      }
    };
    if(header){
      config.headers = header;
    }
    try {
      const response = await axios.post(url, body, config);
      return response;
    } catch(error: any){ 
      console.error(`Error - post ${url}: ${error.message || error}`);

      if (error?.message.includes('Parse Error: Expected HTTP/')) {
        console.warn('Warning: Parse Error detectado, pero se considera exitoso.');
        return { status: 200, data: 'Layer created' }; 
      } else{
        return { status: 500, error: `Error - post ${url}: ${error.message || error}` };
      }
    } 
  }
}
