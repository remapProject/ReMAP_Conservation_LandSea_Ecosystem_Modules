<script setup>
import HeaderPopUp from '@/components/Visor/PopUpNavbar/HeaderPopUp.vue'
import { startDrag, stopDrag } from '@/components/Visor/PopUpNavbar/MouseDragPopUp.js'
import { usePopUpNavbarStore } from '@/store/PopUpNavbarStore.js'
import { useRoute } from 'vue-router'
import { downlaodGeoserver, downloadShapefile, downloadGeopackage } from '@/services/service'
import { useLayersStore } from '@/store/LayersStore'
import { shallowRef, ref, computed, watch} from 'vue'
import { useUnavailable } from '@/store/unableFunctionStore'
import { downloadGeoJSONLocalAnalysis } from '@/module/exportLayerLocalAnalysis'

const props = defineProps({
  id: { required: true, type: String }
})
const popup_store = usePopUpNavbarStore()
const layers_store = useLayersStore();
const unavailable_store = useUnavailable();

const select_layer = shallowRef()
const route = useRoute()
const isLoading = ref(false)
const downloadProgress = ref(0)
const isProgressComputable = ref(false)
const list_layers_export = computed(() =>{
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
    if(layers_store.intersections.length>0){
      layers_store.intersections.forEach((layer)=>{
        res.push(layer.name)
      });
    }
    return res;    
  });
const download = async (type) => {
  // unavailable_store.setActive(true);
  let extension = type
  isLoading.value = true
  downloadProgress.value = 0
  isProgressComputable.value = false
  if (select_layer && select_layer.value) {
    const isIntersection = layers_store.intersections.some(layer => {
      return layer.name === select_layer.value 
    });
    if (isIntersection) {
      if(type==='geopackage' || type==='shapefile'){
        unavailable_store.setActive(true);
        isLoading.value = false
      }else{
        let layerData = layers_store.intersections.find(layer => layer.name === select_layer.value);
        downloadGeoJSONLocalAnalysis(layerData.partialFeatures, select_layer.value + '.geojson');
        isLoading.value = false;
      }
    } else {
      if(type==='geopackage' || type==='shapefile'){
        unavailable_store.setActive(false);
      }    
      try {
        let url
        if (type == 'geojson') {
          // unavailable_store.setActive(true);
          url = await downlaodGeoserver(select_layer.value)
        } else if (type == 'geopackage') {
          const progressHandler = (progressEvent) => {
            if (progressEvent.lengthComputable) {
              downloadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              isProgressComputable.value = true
            }
          }
          url= await downloadGeopackage(select_layer.value, progressHandler);
          if(url===null || url === undefined) throw new Error("Error downloading Geopackage file");
          extension = 'gpkg'
        } else if (type == 'shapefile') {
          const progressHandler = (progressEvent) => {
            if (progressEvent.lengthComputable) {
              downloadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              isProgressComputable.value = true
            }
          }
          url = await downloadShapefile(select_layer.value, progressHandler)
          console.log(url)
          extension = 'zip'
        }
        if(url !== null){
          const link = document.createElement('a')
          link.href = url
          link.download = select_layer.value + '.' + extension
          link.click()
        }
      } catch (error) {
        console.error('Error downloading file:', error)
      } finally {
        isLoading.value = false
      }
    }
  } else {
    isLoading.value = false
  }
}
watch(()=>select_layer,(newlayer)=>{
  if(newlayer){
    const isIntersection = layers_store.intersections.some(layer => {
      return layer.name === select_layer.value 
    });
    if (isIntersection) {
      unavailable_store.setActive(true);
    } else {
      unavailable_store.setActive(false);
    }
    unavailable_store.setActive(false);
  }
})
</script>

<template>
  <div v-if="popup_store.list_active[props.id]" id="export" class="pop_up_layers popUp_visor" @mousedown="startDrag" @mouseup="stopDrag">
    <v-card class="popup_card">
      <template v-slot:title>
        <HeaderPopUp title="Downloads" :id="props.id"></HeaderPopUp>
      </template>
      <v-card-text>
        <div v-if="isLoading" class="download-progress">
          <v-progress-linear
            :indeterminate="!isProgressComputable"
            :model-value="downloadProgress"
            color="primary"
            height="25"
          >
            <template v-slot:default>
              <span v-if="isProgressComputable"> {{ Math.ceil(downloadProgress) }}% </span>
              <span v-else> Preparing to download... </span>
            </template>
          </v-progress-linear>
          <p class="text-caption mt-2">Downloading {{ select_layer }}</p>
        </div>
        <div v-else>
          <v-select class="select_server" v-model="select_layer" :items="list_layers_export" label="Select a layer to export" density="compact" clearable >
          </v-select>
          <template v-if="route.name == 'lsi' || route.name == 'msp' || route.name == 'es'">
            <v-btn @click="download('geojson')" class="btn_format" rounded="lg" size="x-large" :color="'var(--color-orange)'" :disabled="!select_layer">
              <v-icon size="x-large" color="white">mdi-file</v-icon>GeoJSON
            </v-btn>
            <v-btn @click="download('geopackage')" 
              class="btn_format" rounded="lg" size="x-large" 
              :color="'var(--color-dark-blue)'" 
              :disabled="!select_layer || unavailable_store.active"
              >
              <v-icon size="x-large" color="white">mdi-file</v-icon>GeoPackage
            </v-btn>
            <v-btn @click="download('shapefile')" 
              class="btn_format" rounded="lg" size="x-large" 
              :color="'var(--color-green)'" 
              :disabled="!select_layer || unavailable_store.active"
              >
              <v-icon size="x-large" color="white">mdi-zip-box</v-icon>Shapefile
            </v-btn>
          </template>
          <template v-else>
            <v-btn class="btn_format" id="btn_pdf" rounded="lg" size="x-large" >
              <v-icon size="x-large" color="#D82042">mdi-file-pdf-box</v-icon>Download to PDF
            </v-btn>
          </template>
        </div>
      </v-card-text>
    </v-card>
      <AlertInfoUnavailable></AlertInfoUnavailable>
  </div>
</template>

<style scoped>
#export {
  width: 400px;
}
.popup_card {
  padding: 10px 0px;
}
.download-progress {
  text-align: center;
  padding: 20px;
}
.btn_format {
  color: white;
  text-transform: initial;
  margin: 30px 10px 15px 10px;
  padding: 25px 20px;
  width: 115px;
  font-size: 17px;
  font-weight: normal;
}
#btn_pdf {
  width: 200px;
  margin: 0% 15% auto;
  color: initial;
  font-size: 18px;
  box-shadow: none;
  border: 2px solid #979797ff;
}

.btn_format.v-btn--disabled {
  opacity: 0.7;
}
</style>
