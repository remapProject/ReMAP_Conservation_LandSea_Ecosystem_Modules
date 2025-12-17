<script setup>
import Visor from '@/components/Visor/Visor.vue'
import NavbarPanel from '@/components/Visor/NavbarPanel.vue'
import AlertGeneral from '@/components/utils/AlertGeneral.vue'

import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useLayersStore } from '@/store/LayersStore.js'
import { getLayers, getStylesLayers } from '@/services/service.js'

const layers_store=useLayersStore();
const route = useRoute();
const rail = ref(true);
const title = ref('');
const descript_welcome = ref('');
const setRail=(e)=>{
  console.log(e)
  rail.value=e;
}
const setAlert=()=>{
  title.value="Welcome for this module" +
    (route.name == 'msp' ? " MSP Conservation" : 
    (route.name == 'lsi')?" Land Sea Interactions ":
    "Ecosystem Services")
  ;
  descript_welcome.value =
    (route.name == 'msp' ? `
      This tool supports the assessment of (in)compatibility between marine 
      conservation areas (MPAs) and maritime spatial planning (MSP) uses. <br/><br/>
      By overlaying MPAs categories and MSP uses, it helps identify potential 
      conflicts, compatible zones, and areas requiring further research. Users 
      can work with available layers or import their own, allowing both the 
      analysis of existing plans and the exploration of alternative planning 
      scenarios. <br/><br/>
      Results are delivered through maps, legends, and downloadable formats 
      (GeoJSON, GeoPackage or Shapefile).` 
    : 
    (route.name == 'lsi')?`
      This tool supports the assessment of  conflict and compatibility between Costal Land Use 
      and maritime spatial planning (MSP) uses.  <br/><br/>
      By overlaying MSP uses buffering and Costal Land Use, it helps identify potential 
      conflicts and compatible zones. Users can work with available layers or import 
      their own, allowing both the analysis of existing plans and the exploration of 
      alternative planning scenarios. <br/><br/>
      Results are delivered through maps, legends, and downloadable formats 
      (GeoJSON, GeoPackage or Shapefile).` 
    :
    ` This tool analyze the assessment of conflict and compatibility between habitat - Ecosystem Services
      and maritime spatial planning (MSP) uses. <br/><br/>
      By overlaying MSP uses and Ecosystem Services, it helps identify potential 
      conflicts and compatible zones. Users  can work with available layers or import their 
      own, allowing both the analysis of existing plans and the exploration of alternative planning 
      scenarios. <br/><br/>
      Results are delivered through maps, legends, and downloadable formats 
      (GeoJSON, GeoPackage or Shapefile)`);
  
}
onMounted(async ()=>{
  setAlert();
  if(route.name==='es'){
    let styles= await getStylesLayers();
    layers_store.list_styles_layers =styles.list;
    layers_store.list_styles_layers_active=styles.list_active;
  }
  layers_store.getDatastores();
  layers_store.add_layers(await getLayers())
});
onUnmounted(async ()=>{
  layers_store.reset_list()
});
</script>

<template>
  <div class="content_lsi">
    <NavbarPanel @rail="setRail" />
    <Visor :rail="rail" />
    <AlertGeneral :title="title" :text="descript_welcome"></AlertGeneral>
  </div>
</template>

<style scoped>
.content_lsi{
  display: flex;
  flex-direction: row;
  background: #aad3df;
}
</style>