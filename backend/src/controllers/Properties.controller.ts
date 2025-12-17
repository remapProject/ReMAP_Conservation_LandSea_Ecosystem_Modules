import { Request, Response } from "express";
import eHilucsService from "../services/eHilucs";
import TableStyleController from "./TableStyle.controller";
import { Feature } from "../interfaces/feature";
import { Iucn } from "../enums/iucn";
import { ActivitiesLand, ActivitiesMarine, tableLandSea } from "../constants/LandSea/tableLandSea";
import  TableHabitsServices from "../constants/ecosystem/TableHabitsServices";
import { ListCodeEcosystemServices } from "../constants/ecosystem/services";
import { Properties } from "../interfaces/properties";
import { SeaUseFunction } from "../enums/seausefunction";
import PostgisService from "../services/postgis";
import { TypeModule } from "../enums/TypeModule";
import { FeatureCollection } from "@src/interfaces/featureCollections";


const ehilucs = new eHilucsService();
const postgis = new PostgisService();
const tableStyleController = new TableStyleController();
const tableHabitsServices = new TableHabitsServices();
const listDatastoresResults = ["result_conservation", "result_LandSea", "result_EcosystemServices"];
export default class PropertiesController{
    transformProperties(properties: Properties): Properties {
        const normalized: Properties = {  
           seausefct:SeaUseFunction.Allowed,
           hilucsmsp:'',
           designation:''
        };
        for (const key in properties) {
            // Normaliza el nombre del atributo (por ejemplo, a minúsculas y sin espacios)
            const newKey:string = key.toLowerCase().replace(/\s+/g, '');
            normalized[newKey] = properties[key];
        }
        return normalized;
    }
    normalizaKeys(features: Feature[]): Feature[]{
        return features.map(feature => {
            feature.properties = this.transformProperties(feature.properties);
            return feature;
        });
    }
    async getProperties(features: Feature[]): Promise<Feature[]>{
        let activities: string[]=[];
        features.map((item)=>{
            if(item.properties.properties1 && item.properties.properties2){
                item.properties={...item.properties, ...item.properties.properties1, ...item.properties.properties2};
                delete item.properties.properties1;
                delete item.properties.properties2;
            }
            item.properties = this.transformProperties(item.properties);
            if(item.properties.path) delete item.properties.path;
            if(item.properties.layer) delete item.properties.layer;
            let seaUseFunction=item.properties.seausefct;
            let hilucsmsp=item.properties.hilucsmsp;
            if(hilucsmsp && seaUseFunction){
                activities.push(getNameActivity(hilucsmsp));
            } 
            return item;
        });
        if(activities.length === 0) return features;
        try {
            let iucn = await ehilucs.getValuesIucnActivities(getListNameActivities(activities));
            let res= features.map((item)=>{
                    let seaUseFunction=item.properties.seausefct;
                    let hilucsmsp=item.properties.hilucsmsp;
                    let designation = getNameDesignation(item.properties.designation);
                    // if (hilucsmsp && seaUseFunction && designation) {
                    if(seaUseFunction == undefined || !Object.values(SeaUseFunction).includes(seaUseFunction)){
                        seaUseFunction=SeaUseFunction.Priority;
                    }
                    let list_iucn =iucn[getNameActivity(hilucsmsp)];
                    item.properties.color = tableStyleController.getCellTableStyle(
                        getIucn(list_iucn?list_iucn[designation]:undefined), 
                        seaUseFunction, 
                        designation, 
                        getNameActivity(hilucsmsp)
                    );
                    // }else{
                    //     item.properties.color = tableStyleController.getCellTableStyle(Iucn.NotApplied, SeaUseFunction.Allowed);
                    // }
                return item;
            });
            return res;
        } catch (error) {
            console.error('Error - getProperties', error);
            return features;
        }
    }
    async getPropertiesByLayer(name_layer: string, module: TypeModule, attribute:string ='color'): Promise<Boolean>{
        let schema = (module === TypeModule.msp)? listDatastoresResults[0]:
         (module === TypeModule.lsi)? listDatastoresResults[1]:
         (module === TypeModule.es)? listDatastoresResults[2]: 'public';
        let layer: FeatureCollection = { type: "FeatureCollection", features: [] };

        ///CUIDADO QUITAR 'public' PARA PRODUCCION
        for await (const data of postgis.getLayerGeoJSON(name_layer,schema)) {
            if (data.features && data.features.length > 0) {
                layer.features = layer.features.concat(data.features);
            }
        }
        layer.features = this.normalizaKeys(layer.features);
        if (layer.features.length === 0) throw new Error('Layer is empty or not found');
        let features= await this.getProperties(layer.features);
        layer.features=features;
        let updates = layer.features.map((feature) => ({
            [(feature.properties.id)? feature.properties.id : feature.properties.fid]: feature.properties[attribute]
        }));
        console.log(schema)
        await postgis.updateDataLayer(name_layer,schema, attribute,Object.assign({}, ...updates), layer.features[0].properties.fid? 'fid': 'id');
        return true;
    }
    getPropertyBufferLandSea(req:Request, res:Response){
        if (!req.query.activityEmodnet && !req.query.activityCoastal) return res.status(400).send('activityEmodnet and activityCoastal are required');
        let activityEmodnet = req.query.activityEmodnet as string, 
        activityCoastal = req.query.activityCoastal as string;

        let buffer ={};
        let typeMarine =ActivitiesMarine[activityEmodnet];
        if (typeMarine && tableLandSea[typeMarine][activityCoastal]) {
            buffer = tableLandSea[typeMarine][activityCoastal];
        }
        res.status(200).send(buffer);
    }
    getListActivitiesLandSea(_req:Request, res:Response){
        res.status(200).json({
            Marine: Object.keys(ActivitiesMarine),
            Coastal: ActivitiesLand
        })   
    }
    getTablesLandSea(_req:Request, res:Response){
        res.status(200).json({
            table: tableLandSea,
            types_marine: ActivitiesMarine
        })
    }
    getTableEcosystemServices(_req:Request, res:Response){
        const table=tableHabitsServices.getTableHabitsServices();
        if (!table || table.length === 0) {
            return res.status(404).send('Table not found or empty');
        }else{
            res.status(200).json(table);
        }
    }
    getHabitatsByEcosystem(req:Request, res:Response){
        const ecosystem = req.query.ecosystem as string;
        if (!ecosystem) return res.status(400).send('Ecosystem is required');
        const list_habitats = tableHabitsServices.getListHabitatsByEcosystem(ecosystem);
        if (Object.keys(list_habitats).length === 0)  return res.status(404).send('No services found for the specified ecosystem');
        
        res.status(200).json(list_habitats);
    }
    getEcosystemByHabitats(req:Request, res:Response){
        const habitat = req.query.habitat as string;
        if (!habitat) return res.status(400).send('Habitat is required');
        const list_habitats = tableHabitsServices.getListEcosystemByHabitats(habitat)
        if (Object.keys(list_habitats).length === 0)  return res.status(404).send('No services found for the specified Habitat');
        
        res.status(200).json(list_habitats);
    }
    getListHabitatsSumByEcosystem(){
        let table: Object [] =tableHabitsServices.getTableHabitsServices();
        let list_add_habitats: {[key: string]: any[]} ={};
        for (let i = 0; i < table.length; i++) {
            const habitat_row_values = Object.values(table[i])[0];
            const name_habitat = Object.keys(table[i])[0];
            let total_Ecosystem=getAddEcosystemByHabitat(Object.values(habitat_row_values));
            let provisioning_Ecosystem=getAddProvisioningGroupByHabitat(Object.values(habitat_row_values));
            let regulation_Ecosystem=getAddRegulationGroupByHabitat(Object.values(habitat_row_values));
            let cultural_Ecosystem=getAddCulturalGroupByHabitat(Object.values(habitat_row_values));
            let ListCodeEcosystemServices=getCodeEcosystemServices(Object.values(habitat_row_values));
            if(!list_add_habitats[name_habitat]){
                list_add_habitats = {...list_add_habitats, 
                    [name_habitat]: [
                        total_Ecosystem, provisioning_Ecosystem, 
                        regulation_Ecosystem, cultural_Ecosystem, ListCodeEcosystemServices]};
            }else{
                list_add_habitats[name_habitat] = [total_Ecosystem, provisioning_Ecosystem, 
                    regulation_Ecosystem, cultural_Ecosystem, ListCodeEcosystemServices];
            }
        }
        return list_add_habitats;
    }
}
function getNameActivity(activity:string){
    let actividad =activity.split('/');
    let name=actividad[actividad.length-1];
    return  name.slice(0, name.length-5);
}

function getNameDesignation(designation:string){
    let name_designation=designation.split('/');
    switch (name_designation[name_designation.length-1]) {
        case 'strictNatureReserve':
            return 'Ia Strict nature reserve';
        case 'wildernessArea':
            return 'Ib Wilderness area';
        case 'nationalPark':
            return 'II National park';
        case 'naturalMonument':
            return 'III Natural monument or feature';
        case 'habitatSpeciesManagementArea':
            return 'IV Habitat/species management area';
        case 'protectedLandscapeOrSeascape':
            return 'V Protected seascape';
        case 'managedResourceProtectedArea':
            return 'VI Protected areas with sustainable use of natural resources';
        default:
            return 'Not applied';
    }
}

function getListNameActivities(activities: string[]){
    return activities.filter((activity, i, self)=>{
        return self.indexOf(activity)===i;
    });
}
function getIucn(column: any):Iucn{
    if(column != undefined && column!= '') {
        let col:Iucn=column.trim().replace('*', '') as Iucn;
        return col;
    }else{
        return Iucn.NotApplied;
    }

}
const index_add_total=[3,6,7,8,10,12,14,15,17,19,20,22,24,28,30,31,32,34,35]
function getAddEcosystemByHabitat(list: string[]){
    let result:number = 0;
    list.forEach((item, i) => {
        if(index_add_total.includes(i)){
            let num =parseInt(item);
            if (!isNaN(num))  result += parseInt(item);
        }
    });
    return result;
}
const index_add_provisioning=[3,6,7,8]
function getAddProvisioningGroupByHabitat(list: string[]){
    let result:number = 0;
    list.forEach((item, i) => {
        if(index_add_provisioning.includes(i)){
            let num =parseInt(item);
            if (!isNaN(num)) result += parseInt(item);
        }
    });
    return result;
}
const index_add_regulation=[10,12,14,15,17,19,20,22,24];
function getAddRegulationGroupByHabitat(list: string[]){
    let result:number = 0;
    list.forEach((item, i) => {
        if(index_add_regulation.includes(i)){
            let num =parseInt(item);
            if (!isNaN(num)) result += parseInt(item);
        }
    });
    return result;
}
const index_add_cultural=[28,30,31,32,34,35];
function getAddCulturalGroupByHabitat(list: string[]){
    let result:number = 0;
    list.forEach((item, i) => {
        if(index_add_cultural.includes(i)){
            let num =parseInt(item);
            if (!isNaN(num)) result += parseInt(item);
        }
    });
    return result;
}
let indexCodeNames=[2,5,10,17,22,23,29,35];
function getCodeEcosystemServices(list:string[]){
    let result: string[] = [];
    list.forEach((item, i) => {
        if(indexCodeNames.includes(i)){
            let num =parseInt(item);
            if (!isNaN(num) && num === 1) result.push(ListCodeEcosystemServices[i]);
        }
    });
    return result;
}
