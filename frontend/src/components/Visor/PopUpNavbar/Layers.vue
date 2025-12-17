<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { startDrag, stopDrag } from '@/components/Visor/PopUpNavbar/MouseDragPopUp.js'
import InfoFeedback from '@/components/utils/InfoFeedback.vue'
import HeaderPopUp from '@/components/Visor/PopUpNavbar/HeaderPopUp.vue'
import { usePopUpNavbarStore } from '@/store/PopUpNavbarStore.js'
import { useLayersStore } from '@/store/LayersStore.js'
import { getLayers, getStylesLayers } from '@/services/service.js'
import { useImportLayersStore } from '@/store/ImportLayersStore'
import { useUnavailable } from '@/store/unableFunctionStore'
import { useLoadingStore } from '@/store/LoadingStore.js'
const route = useRoute();

const props = defineProps({
  id: { required: true, type: String }
})
const layers_store = useLayersStore()
const popup_store = usePopUpNavbarStore()
const unavailable = useUnavailable()
const import_layers_store = useImportLayersStore()
const loadingStore = useLoadingStore()

const titlePopUp = 'Layers'

const selected = ref(['ULPGC-ECOAQUA'])

const likesAll = computed(() => selected.value.length === layers_store.list_server.length)
const likesSome = computed(() => selected.value.length > 0)

const info = (route.name === 'msp')? 
  'Browse available MPAs and MSP layers. Within this menu you can select and view layers. These datasets are the basis for the spatial (in)compatibility analysis of MPAs and MSP.'
  : (route.name == 'lsi')?
  'Browse available Coastal Land Use and MSP layers. Within this menu you can select and view layers.'
  :
  'Browse available Ecosystem Services and MSP layers. Within this menu you can select and view layers.'
  ;

const groupedLayers = computed(() => {
  let module=(route.name ==='msp')? ' - MPA / MSP': 
    (route.name =='lsi')?
    ' - MSP / Coastal Land Use':
    ' - MSP / Ecosystem service';
  const groups = {
    geoserverOriginal: { title: 'Input data'+module, layers: [] },
    geoserverConservation: { 
      title: 'Output data' + module+ '- preprocessed', 
      layers: [] 
    },
    geoserverLandSea: { 
      title:'Output data' + module + '- preprocessed', 
      layers: [] 
    },
    geoserverEcosystem: { 
      title: 'Output data' + module + '- preprocessed',
      layers: [] 
    },
    intersections: {
      title: 'Output data' + module + ' - processed by user',
      layers: layers_store.intersections ?? []
    },
    imported: { title: 'Imported data (by user)', layers: [] },
      emodnet: { title: 'Emodnet', layers: [] },
  }
  layers_store.list_layers.forEach((layer) => {
    // if (layer == 'mspzoningpoly') {
    //   groups.emodnet.layers.push(layer)
    // } else 
    if (import_layers_store.isImported(layer)) {
      groups.imported.layers.push(layer)
    } else {
      const datastore = layers_store.getDatastoreByLayer(layer)

      if (datastore) {
        switch (datastore) {
          case 'MSP':
          case 'postgis':
          case 'base de datos':
            groups.geoserverOriginal.layers.push(layer)
            break
          case 'ReMAP_intersection_Conservation':
            (route.name === 'msp') &&
            groups.geoserverConservation.layers.push(layer)
            break
          case 'ReMAP_intersection_LandSea':
            (route.name === 'lsi') &&
            groups.geoserverLandSea.layers.push(layer)
            break
          case 'ReMAP_intersection_EcosystemServices':
            let types=[];
            (route.name === 'es') &&
            
            groups.geoserverEcosystem.layers.push(layer)
            break
          default:
            groups.geoserverOriginal.layers.push(layer)
        }
      }
    }
  })
  return groups
})

const toggle = () => {
  if (likesAll.value) {
    selected.value = []
  } else {
    selected.value = [...layers_store.list_server]
  }
}

const add_list = async () => {
  let layers = await getLayers()
  if(route.name==='es' && layers_store.list_styles_layers.length == 0){
    let list_styles =await getStylesLayers()
    layers_store.list_styles_layers= list_styles.list;
    layers_store.list_styles_layers_active=list_styles.list_active;
  }
  layers_store.add_layers(layers)
  layers_store.add_layers_geoserver(layers);
}
const getMetadata = async () => {
    unavailable.active=true;
}

const checkStyleLayer=(layer)=>{
  if(layers_store.list_styles_layers.length==0) return false;
  let layer_styles = layers_store.list_styles_layers.filter((item) => Object.keys(item)[0] === layer);
  if(layer_styles.length==0) return false;
  return layers_store.list_styles_layers.filter((item)=>Object.keys(item)[0]===layer)[0][layer].length> 1? true: false;
}
const getStyles = (layer) => {
  let styles = layers_store.list_styles_layers.filter((item) => Object.keys(item)[0] === layer)[0][layer];
  return styles.length > 0 ? styles: [];
}

watch(
  () => selected.value,
  async () => {
    loadingStore.activeLoading()
    if (selected.value.includes(layers_store.list_server[0])) {
      add_list()
    } else {
      layers_store.remove_layers_geoserver()
    }
    // if (selected.value.includes(layers_store.list_server[1])) {
    //   layers_store.add_layer('mspzoningpoly')
    // } else {
    //   layers_store.remove_layer('mspzoningpoly')
    // }
    if (selected.value.includes(layers_store.list_server[1])) {
      layers_store.add_layers(import_layers_store.list_name_layers)
    } else {
      layers_store.remove_layers(import_layers_store.list_name_layers)
    }

    if (selected.value.length == 0) {
      layers_store.reset_list()
    }
  },
  { deep: true }
)
watch(
  () => layers_store.list_layers,
  async (newLayers) => {
    if (newLayers.length) await layers_store.getDatastores();
  },
  { immediate: true, deep: true }
)
watch(()=> import_layers_store.list_name_layers, async (newLayers)=>{
  if(newLayers.length){
    if(selected.value.includes(layers_store.list_server[1])){
      layers_store.add_layers(newLayers);
    }
  }
},{deep:true})
onMounted(async () => {
  await add_list()
})
</script>

<template>
  <div v-if="popup_store.list_active[props.id]" id="layers" class="pop_up_layers popUp_visor" @mousedown="startDrag" @mouseup="stopDrag">
    <v-card>
      <template v-slot:title>
        <HeaderPopUp :title="titlePopUp" :id="props.id"></HeaderPopUp>
      </template>
      <v-card-text>
        <div>
          <InfoFeedback :info="info" :type="'info'"></InfoFeedback>
          <v-select v-model="selected" :items="layers_store.list_server" label="Servers" density="compact" clearable chips multiple >
            <template v-slot:prepend-item>
              <v-list-item title="Select All" @click="toggle">
                <template v-slot:prepend>
                  <v-checkbox-btn
                    :color="likesSome ? 'indigo-darken-4' : undefined"
                    :indeterminate="likesSome && !likesAll"
                    :model-value="likesAll"
                  >
                  </v-checkbox-btn>
                </template>
              </v-list-item>
              <v-divider class="mt-2"></v-divider>
            </template>
          </v-select>
          <div class="content_layers" v-if="layers_store.list_layers.length > 0">
            <template v-for="(group, key) in groupedLayers" :key="key">
              <div v-if="group.layers.length" class="group-title">
                <h3 class="group-header">{{ group.title }}</h3>
              </div>
              <template v-if="group.title.includes('processed by user')">
                <v-list-item v-for="(layer, index) in group.layers" :key="index">
                  <template v-slot:title>
                    <v-checkbox
                      v-model="layers_store.list_active"
                      class="check"
                      :value="layer.name"
                      :color="'var(--color-text-blue)'"
                    >
                      <template v-slot:label>
                        <div class="d-flex align-center">
                          <v-icon small class="mr-2">mdi-layers-union</v-icon>
                          <h3 class="label_layer">{{ layer.name }}</h3>
                        </div>
                      </template>
                    </v-checkbox>
                  </template>
                </v-list-item>
              </template>

              <v-list-item
                v-else
                :class="[
                  { margin_layers: true },
                  { divider_layers: index != layers_store.list_layers.length - 1 }
                ]"
                v-for="(layer, index) in group.layers"
                :key="index"
              >
                <template v-slot:title>
                  <v-checkbox
                    v-model="layers_store.list_active"
                    class="check"
                    :value="layer"
                    :color="'var(--color-text-blue)'"
                  >
                    <template v-slot:label
                      ><h3 class="label_layer">{{ layer }}</h3></template
                    >
                  </v-checkbox>
                </template>
                <template v-slot:append>
                  <v-select v-if="checkStyleLayer(layer)" class="select_style_layer" label="Style"
                    v-model="layers_store.list_styles_layers_active[layer]" :items="getStyles(layer)" density="compact"></v-select>
                  <!-- <v-btn variant="text" icon @click="getMetadata(layer)"> -->
                    <!-- <template #default> -->
                      <!-- <v-icon :color="'var(--color-btn-metadata)'">mdi-text-box-outline</v-icon> -->
                    <!-- </template> -->
                  <!-- </v-btn> -->
                </template>
              </v-list-item>
            </template>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
#layers {
  width: 30vw;
  max-width: 600px;
}
.content_layers {
  height: 450px;
  overflow-y: auto;
  width: 100%;
  overflow-x: hidden;
}
.group-title {
  background-color: #f5f5f5;
  margin-top: 1rem;
  padding: 0.5rem;
}

.group-header {
  color: var(--color-text-blue);
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
}
.group-title:first-child {
  margin-top: 0;
}
.label_layer {
  font-size: 16px;
}
.divider_layers {
  border-bottom: 1.25px solid hsla(0, 0%, 67%, 0.5);
}
.margin_layers {
  margin-right: 5px;
}
</style>
