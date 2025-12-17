import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePopUpNavbarStore } from '@/store/PopUpNavbarStore.js'
import  * as turf from '@turf/turf'
import { useLayersStore } from '@/store/LayersStore.js'
const allowedKeys = ['designation', 'hilucsmsp', 'color', 
  'seausefct', 'type_buffer', 'meters', 'hilucsmsp_emodnet', 
  'hilucsmsp_costal', 'total_ecosystemservices', 
  'referencehabitattypeid','loclahabitatname','ecosystem_services', 'total_provisioning', 'total_regulation_maintenance', 'total_cultural'];
export const useAttributesLayersStore = defineStore('attributeslayersStore',()=>{
  const layers_store = useLayersStore();
  const attributes=ref([]);
  const attributes_imported=ref([]);
  const attributes_result=ref([]);
  // const list_type_name_attributes=ref({})
  const store=usePopUpNavbarStore();
  const list_name_EcosystemServices=ref([]);
  const list_name_habitats=ref([]);
  const reset_attribute=()=>{
    attributes.value=[];
  }
  const add_attributes= (list)=>{
    let res=[];
    list.features.forEach((feature)=>{
      delete feature.geom;
      delete feature.geometry;
      delete feature.geometry_name;
      if(feature.properties.layer) delete feature.properties.layer;
      if(feature.properties.path) delete feature.properties.path;
      res.push(feature);
    });
    // list_type_name_attributes.value={...list_type_name_attributes.value, {}}
    attributes.value=[...attributes.value,...res]
  }
  const add_attributes_layers_imported= (list_name_layers, coordinate)=>{
    list_name_layers.forEach((name_layer)=>{
      let list_attr= attributes_imported.value.filter((feature)=>feature.id.includes(name_layer+'.')
    );
      if(list_attr.length==0) return;
      let point=turf.point(coordinate);
      let list_features=list_attr.filter((feature)=>{
        return turf.booleanPointInPolygon(point,feature);
    });
      if(list_features.length>0){
        let fc=list_features.map((f_original)=>{ 
          const feature= {...f_original}
          delete feature.geom;
          delete feature.geometry;
          delete feature.geometry_name;
          if(feature.type) delete feature.type;
          return feature;
        });
        attributes.value=[ ...attributes.value, ...fc];
      }
    })
  }
  const add_attributes_result_click= (list_name_layers, coordinate)=>{
    list_name_layers.forEach((name_layer)=>{
      let list_attr= attributes_result.value.filter((feature)=>feature.id.includes(name_layer+'.')
    );
      if(list_attr.length==0) return;
      console.log(list_attr);
      let point=turf.point(coordinate);
      let list_features=list_attr.filter((feature)=>{
        return turf.booleanPointInPolygon(point,feature);
    });
      if(list_features.length>0){
        let fc=list_features.map((f_original)=>{ 
          const feature= {...f_original}
          delete feature.geom;
          delete feature.geometry;
          delete feature.geometry_name;
          if(feature.type) delete feature.type;
          if(feature.properties.layer) delete feature.properties.layer;
          if(feature.properties.path) delete feature.properties.path;
          return feature;
        });
        attributes.value=[ ...attributes.value, ...fc];
      }
    })
  }
  const add_attributes_imported= (layer, name_layer)=>{
    let res=[];
    layer.features.forEach((feature)=>{

      let id = feature.id ? 
        feature.id : 
        feature.properties.fid ? 
          feature.properties.fid : 
          feature.properties.id ? feature.properties.id : 
            Math.random().toString(36).substring(2, 15);
      if(feature.id) delete feature.id;
      res.push({id: name_layer+ '.' + id,...feature});
    });
    attributes_imported.value=[...attributes_imported.value,...res]
  }
    const add_attributes_result= (list_features, name_layer)=>{
    let res=[];
    list_features.forEach((feature)=>{

      let id = feature.id ? 
        feature.id : 
        feature.properties.fid ? 
          feature.properties.fid : 
          feature.properties.id ? feature.properties.id : 
            Math.random().toString(36).substring(2, 15);
      if(feature.id) delete feature.id;
      res.push({id: name_layer+ '.' + id,...feature});
    });
    attributes_result.value=[...res];
  }
  const getListAttributes=(id, module)=>{
    let list_features_properties = attributes.value.filter((attr)=>attr.id.includes(id));
    let datastore = layers_store.getDatastoreByLayer(id);
    if(datastore 
      // && ( datastore !== 'postgis' || datastore !== 'base de datos' || datastore !== 'postgis_remap_test')
    ){
      list_features_properties.forEach(feature => {
        Object.keys(feature.properties).forEach(key => {
          const keyLower = key.replace(/\s+/g, '').toLowerCase();
          if (!allowedKeys.includes(keyLower)) {
            delete feature.properties[key];
          }
        });
      });
    }
  //   if(module === 'msp' && datastore === 'ReMAP_intersection_Conservation'){
  //     return res? Object.keys(res.properties).filter((key)=>{
  //       switch(key.toLowerCase()){
  //         case 'designation': 
  //         case 'hilucsmsp': 
  //         case 'color': 
  //         case 'seausefct': 
  //         return 
  //         default: return false;
  //       }
  //     }):[];
  //   } else if(module ==='lsi' && datastore === 'ReMAP_intersection_LandSea'){
  //     return res? Object.keys(res.properties).filter((key)=>{
  //       switch(key.toLowerCase()){
  //         case 'type_buffer': 
  //         case 'hilucsmsp_emodnet': 
  //         case 'hilucsmsp_costal':
  //           return true;
  //         default: return false;
  //       }
  //     }):[];
  // }  else if(module ==='es' && datastore === 'ReMAP_intersection_EcosystemServices'){
  //    return res? Object.keys(res.properties).filter((key)=>{
  //       switch(key.toLowerCase()){
  //         case 'total_ecosystemservices': 
  //         case 'ecosystem_services': 
  //         case 'total_provisioning':
  //         case 'total_regulation_maintenance':
  //         case 'total_cultural':
  //           return true;
  //         default: return false;
  //       }
  //     }):[];
  //   }
    return list_features_properties;
  }
  const getNameAttributes=(id, module)=>{
    let datastore = layers_store.getDatastoreByLayer(id);
    let res=attributes.value.find((attr)=>attr.id.includes(id));
    if(module === 'msp' && datastore === 'ReMAP_intersection_Conservation'){
      return res? Object.keys(res.properties).filter((key)=>{
        switch(key.toLowerCase()){
          case 'designation': 
          case 'hilucsmsp': 
          case 'color': 
          case 'seausefct': 
          return true;
          default: return false;
        }
      }):[];
    } else if(module ==='lsi' && datastore === 'ReMAP_intersection_LandSea'){
      return res? Object.keys(res.properties).filter((key)=>{
        switch(key.toLowerCase()){
          case 'type_buffer': 
          case 'hilucsmsp_emodnet': 
          case 'hilucsmsp_costal':
            return true;
          default: return false;
        }
      }):[];
  }  else if(module ==='es' && datastore === 'ReMAP_intersection_EcosystemServices'){
     return res? Object.keys(res.properties).filter((key)=>{
        switch(key.toLowerCase()){
          case 'total_ecosystemservices': 
          case 'ecosystem_services': 
          case 'total_provisioning':
          case 'total_regulation_maintenance':
          case 'total_cultural':
            return true;
          default: return false;
        }
      }):[];
    }
    return res? Object.keys(res.properties):[];;
  }
  const getIdLayers=()=>{
    let res =[... new Set(attributes.value.map((attr)=>attr.id.split('.')[0]))];
    return res;
  }
  watch(() => attributes.value, (newValue) => {
      if(attributes.value.length > 0) store.add_PopUp('attributes');
    },
    { deep: true }
  );
  return { 
    attributes, list_name_EcosystemServices, list_name_habitats, 
    reset_attribute, add_attributes, getListAttributes, getNameAttributes,
    getIdLayers, add_attributes_imported, add_attributes_layers_imported,
    add_attributes_result, add_attributes_result_click
  }
});