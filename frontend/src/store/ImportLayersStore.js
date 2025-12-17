import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useImportLayersStore = defineStore('importlayersStore',()=>{
  const list_name_layers=ref([]);
  const list_file=ref([])
  const list_type_files=ref([]);
  const reset_list=()=>{
    list_name_layers.value=[];
    list_file.value=[];
  }
  const add_layers= (list)=>{
    list.forEach(element => {
      add_layer(element);
    });
  }
  const add_layer=(name_layer)=>{
    if (!list_name_layers.value.includes(name_layer)) list_name_layers.value.push(name_layer);
  }
  const add_file=(name_file,file)=>{
    list_file.value.push({[name_file]:file});
  }
  const add_type_file=(name, type)=>{
    if(!list_type_files.value.some((element)=>Object.keys(element)[0]===name)) list_type_files.value.push({[name]:type});
  }
  const getFile=(name_layer)=>{
    let i=list_file.value.findIndex((element)=>Object.keys(element)[0]===name_layer);
    return list_file.value[i][name_layer];
  }

  const isImported = (name_layer) => {
    return list_file.value.some((element) => Object.keys(element)[0] === name_layer);
  }
  const checkTypeLayer=(name_layer)=>{
    let i=list_type_files.value.findIndex((element)=>Object.keys(element)[0]===name_layer);
    return list_type_files.value[i][name_layer];
  }
  return { 
    list_name_layers, list_file, list_type_files, add_layers, add_layer, add_type_file, 
    checkTypeLayer, add_file, getFile, isImported, reset_list }
});