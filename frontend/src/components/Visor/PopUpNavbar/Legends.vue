<script setup>
  import HeaderPopUp from '@/components/Visor/PopUpNavbar/HeaderPopUp.vue'
  import { computed, ref, watch } from 'vue'
  import { startDrag, stopDrag } from '@/components/Visor/PopUpNavbar/MouseDragPopUp.js'
  import { usePopUpNavbarStore } from '@/store/PopUpNavbarStore.js'
  import { useLayersStore } from '@/store/LayersStore.js'
  import { getLegend } from '@/services/service.js'
  import { useRoute } from 'vue-router'
  import { useImportLayersStore } from '@/store/ImportLayersStore'

  const titlePopUp="Legends";
  const props = defineProps({
    id:{ required:true, type: String}
  })
  const route = useRoute();
  const layers_store = useLayersStore();
  const popup_store=usePopUpNavbarStore();
  const imported_store = useImportLayersStore();
  const selected=ref([]);
  const legend=ref([]);
  const list_layers_legends = computed(() =>{
    let res=[];
    if(route.name ==='msp'){
      res.push(...layers_store.list_layers.filter((layer) => {
        let datastore = layers_store.getDatastoreByLayer(layer);
        if(datastore && (datastore.includes('postgis') || datastore == 'ReMAP_intersection_Conservation')){
            return layer;        
        }
      }));
    }else if (route.name =='lsi'){
      res= layers_store.list_layers.filter((layer) => {
        let datastore = layers_store.getDatastoreByLayer(layer);
        if(datastore && (datastore.includes('postgis') || datastore == 'ReMAP_intersection_LandSea')){
            return layer;        
        }
      });
    }else if(route.name =='es'){
      res= layers_store.list_layers.filter((layer) => {
        let datastore = layers_store.getDatastoreByLayer(layer);
        if(datastore && (datastore.includes('postgis') || datastore == 'ReMAP_intersection_EcosystemServices')){
            return layer;        
        }
      });

    }else{
      res= layers_store.list_layers.filter((layer) => {
        let datastore = layers_store.getDatastoreByLayer(layer);
        if(datastore && (datastore.includes('postgis'))){
            return layer;        
        }
      });
    }
    if(imported_store.list_name_layers.length>0)res.push('imported layer ' + (route.name==='msp' ? 'msp' : (route.name==='es' ? '' : 'land_sea')));
    return res;    
  });
  watch(() => selected.value, async (newValue) => {
      
      legend.value=await getLegend(newValue);
    },
    { deep: true }
  );
</script>

<template>
  <div v-if="popup_store.list_active[props.id]" class="pop_up_layers popUp_visor" id="legends"  @mousedown="startDrag" @mouseup="stopDrag">
    <v-card>
      <template v-slot:title>
        <HeaderPopUp :title="titlePopUp" :id="props.id"></HeaderPopUp>
      </template>
      <v-card-text class="content_card_legend">
        <v-select class="select_server" v-model="selected" :items="list_layers_legends" label="Choose a Layer" density="compact" clearable>
        </v-select>
        <v-img v-if="legend"  :width="175" aspect-ratio="4/3" cover :src="legend"></v-img>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.content_card_legend{
  min-height: 250px;
}
</style>