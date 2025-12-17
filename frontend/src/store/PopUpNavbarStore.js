import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePopUpNavbarStore = defineStore('popUpStore',()=>{
  const list_active=ref({});
  const list_zIndex=ref([]);
  const tokenDrawSetting=ref(false);
  const add_PopUp= (id)=>{
    const index = list_zIndex.value.indexOf(id);
    if (index !== -1) {
      list_zIndex.value.splice(index, 1);
    }
    list_active.value[id]=true;
    list_zIndex.value.push(id);
  };
  const close_PopUp= (id)=>{
    if(list_active.value[id] != undefined){
      list_active.value[id]=false;
    }
  };
  const delete_PopUp= (id)=>{
    delete list_active.value[id];
    const index= list_zIndex.value.indexOf(id);
    if(index !==-1) list_zIndex.value.splice(index,1);
  };
  const delete_list_popUp= ()=>{
    list_active.value = {};
    list_zIndex.value = [];
  };
  const getZIndex= (id)=>{
    const index= list_zIndex.value.indexOf(id);
    return index !== -1 ? index + 10: 0;
  };

  return { list_active, tokenDrawSetting, add_PopUp, close_PopUp, delete_PopUp, delete_list_popUp, getZIndex }
});