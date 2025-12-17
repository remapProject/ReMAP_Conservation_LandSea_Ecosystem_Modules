<script setup>
import { onMounted, ref, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

import GeoJSON from 'ol/format/GeoJSON'
import bbox from '@turf/bbox'
import { polygon as turfPolygon } from '@turf/helpers'
import booleanIntersects from '@turf/boolean-intersects'
import bboxPolygon from '@turf/bbox-polygon'

import HeaderPopUp from '@/components/Visor/PopUpNavbar/HeaderPopUp.vue'
import InfoFeedback from '@/components/utils/InfoFeedback.vue'
import AlertGeneral from '@/components/utils/AlertGeneral.vue'
import { startDrag, stopDrag } from '@/components/Visor/PopUpNavbar/MouseDragPopUp.js'
import ContentVersionES from './ContentVersionES.vue'
import { requestFullOfflineIntersection } from '@/services/intersection.service'
import { getLayer_imported, getLayerWFS } from '@/services/service'
import { usePopUpNavbarStore } from '@/store/PopUpNavbarStore.js'
import { useLayersStore } from '@/store/LayersStore'
import { useImportLayersStore } from '@/store/ImportLayersStore'
import { useMapInteractionStore } from '@/store/MapInteractionStore'
import { useUnavailable } from '@/store/unableFunctionStore'
import { createPartialIntersectionWorker, createLandSeaIntersectionWorker } from '@/utils/workerFactory.js'

const props = defineProps({
  id: { required: true, type: String }
})
const title = ref('Intersections')
const route = useRoute()
const layers_store = useLayersStore()
const import_layers_store = useImportLayersStore()
const mapInteractionStore = useMapInteractionStore()
const popup_store = usePopUpNavbarStore()
const unavailable_store = useUnavailable();

const selectedOperation = ref(null)
const list_operations = ref(['Intersection'])
const selectedLayers = ref([])
const email = ref('')
const showAlert = ref(false)
const isLoading = ref(false)
const alertMessage = ref('')
const alertType = ref('success')
const disabled = ref(false);

// Web Worker para partial intersections
let intersectionWorker = null
const isProcessing = ref(false)
const progressValue = ref(0)
const showProgress = ref(false)
const canCancel = ref(false)
const partial=(e)=>{
  selectedOperation.value = 'partial';
  popup_store.tokenDrawSetting=true
}
const showTemporaryAlert = (message, type = 'success') => {
  alertMessage.value = message
  alertType.value = type
  showAlert.value = true
  // if(alertType.value === 'error')  setTimeout(() => { showAlert.value = false}, 3000);

}

const toggleLayer = (layer) => {
  const index = selectedLayers.value.indexOf(layer)
  if (index === -1) {
    if (selectedLayers.value.length < 2) {
      selectedLayers.value.push(layer)
    }
  } else {
    selectedLayers.value.splice(index, 1)
  }
}

const getLayerNumber = (layer) => {
  const index = selectedLayers.value.indexOf(layer)
  return index !== -1 ? index + 1 : null
}

const handlePartialIntersection = async () => {
  console.log('[Setting] handlePartialIntersection called')
  
  // Validaciones iniciales
  if (selectedLayers.value.length !== 2 || mapInteractionStore.drawnArea == null) {
    showTemporaryAlert('Please select two layers and a drawn area.', 'error')
    return
  }

  if (isProcessing.value) {
    showTemporaryAlert('Intersection already in progress', 'error')
    return
  }

  try {
    // Inicializar estado de procesamiento
    isProcessing.value = true
    showProgress.value = true
    progressValue.value = 0
    canCancel.value = true
    // No cambiar disabled para no interferir con la UI
    console.log('[Setting] State initialized:', {
      isProcessing: isProcessing.value,
      showProgress: showProgress.value,
      progressValue: progressValue.value,
      canCancel: canCancel.value
    })
    showTemporaryAlert('Starting partial intersection calculation...', 'info')

    // Preparar datos geográficos
    const areaFeature = new GeoJSON().readFeature(mapInteractionStore.drawnArea)
    const drawnPolygon = turfPolygon(areaFeature.getGeometry().getCoordinates())
    const layerBbox = bbox(drawnPolygon)
    const [minX, minY, maxX, maxY] = layerBbox
    const bboxParam = `${minX},${minY},${maxX},${maxY},EPSG:4326`

    const getLayerData = async (layerName) => {
      if (import_layers_store.isImported(layerName)) {
        let file = import_layers_store.getFile(layerName)
        try {
          const layer = await getLayer_imported(
            layerName,
            file,
            file.name.split('.')[1] == 'geojson' ? 'geojson' : 'gpkg'
          )
          const bboxPoly = bboxPolygon(layerBbox)
          return {
            ...layer,
            features: layer.features.filter((feature) => booleanIntersects(feature, bboxPoly))
          }
        } catch (error) {
          console.error('Error al añadir la capa importada:', error)
          throw error
        }
      } else {
        const datastore =
          route.name == 'lsi' ? 'ReMAP_intersection_LandSea' : 'ReMAP_intersection_Conservation'
        return await getLayerWFS(layerName, bboxParam)
      }
    }

    // Obtener datos de las capas
    showTemporaryAlert('Loading layer data...', 'info')
    const [layer1Data, layer2Data] = await Promise.all(
      selectedLayers.value.map(async (layerName) => await getLayerData(layerName))
    )

    // Validar que hay datos
    if (!layer1Data?.features?.length || !layer2Data?.features?.length) {
      throw new Error('One or both layers have no features in the selected area')
    }

    // Crear y configurar Web Worker usando factory
    try {
      intersectionWorker = createPartialIntersectionWorker()
      console.log('[Setting] Worker created successfully')
    } catch (error) {
      console.error('[Setting] Failed to create worker:', error)
      showTemporaryAlert('Error creating worker for intersection calculation', 'error')
      cleanupWorker()
      return
    }

    // Generar nombre único para esta intersección
    const intersectionName = `Partial Intersection ${Date.now()}`
    
    // Configurar listener del worker
    intersectionWorker.onmessage = (event) => {
      const message = event.data
      console.log('[Setting] Worker message received:', message.type, message)
      
      switch (message.type) {
        case 'progress':
          progressValue.value = message.value
          console.log('[Setting] Progress updated:', progressValue.value)
          break
          
        case 'partial':
          // Enviar features parciales al Visor con nombre consistente
          layers_store.addPartialIntersectionFeatures({
            features: message.features,
            layerName: intersectionName
          })
          break
          
        case 'done':
          if (message.total === 0) {
            showTemporaryAlert('No intersections found between the selected layers in the drawn area.', 'warning')
          } else {
            showTemporaryAlert(`Partial intersection completed! Found ${message.total} intersections. Processing properties...`, 'success')
            // Finalizar la intersección para aplicar mapeo de propiedades
            layers_store.finalizePartialIntersection(intersectionName)
          }
          cleanupWorker()
          break
          
        case 'error':
          console.error('Worker error:', message.error)
          showTemporaryAlert(`Error: ${message.error}`, 'error')
          cleanupWorker()
          break
      }
    }

    intersectionWorker.onerror = (error) => {
      console.error('Worker error:', error)
      showTemporaryAlert('Error initializing intersection calculation', 'error')
      cleanupWorker()
    }

    // Enviar datos al worker
    const workerPayload = {
      layer1: layer1Data,
      layer2: layer2Data,
      drawnArea: JSON.parse(new GeoJSON().writeFeature(areaFeature))
    }

    intersectionWorker.postMessage({
      cmd: 'RUN',
      payload: workerPayload
    })
    showTemporaryAlert('Calculating intersections in background...', 'info')

  } catch (error) {
    console.error('Error in partial intersection:', error)
    showTemporaryAlert(`Error: ${error.message}`, 'error')
    cleanupWorker()
  }
}

// Función para cancelar el procesamiento
const cancelIntersection = () => {
  if (intersectionWorker && isProcessing.value) {
    intersectionWorker.postMessage({ cmd: 'ABORT' })
    intersectionWorker.terminate()
    intersectionWorker = null
    
    showTemporaryAlert('Intersection calculation cancelled', 'info')
    cleanupWorker()
  }
}

// Función para limpiar el estado del worker
const cleanupWorker = () => {
  isProcessing.value = false
  showProgress.value = false
  progressValue.value = 0
  canCancel.value = false
  // Solo resetear disabled si no estaba desabilitado por otras razones
  if (route.name === 'msp') {
    disabled.value = false
  }
  
  if (intersectionWorker) {
    intersectionWorker.terminate()
    intersectionWorker = null
  }
}

// Función específica para Land-Sea Interactions con buffer
const handleLandSeaIntersection = async () => {
  console.log('[Setting] handleLandSeaIntersection called')
  
  // Validaciones iniciales
  if (selectedLayers.value.length !== 2 || mapInteractionStore.drawnArea == null) {
    showTemporaryAlert('Please select two layers and a drawn area.', 'error')
    return
  }

  if (isProcessing.value) {
    showTemporaryAlert('Land-Sea intersection already in progress', 'error')
    return
  }

  try {
    // Inicializar estado de procesamiento
    isProcessing.value = true
    showProgress.value = true
    progressValue.value = 0
    canCancel.value = true
    
    console.log('[Setting] Land-Sea processing state initialized')
    showTemporaryAlert('Starting Land-Sea intersection with buffer calculation...', 'info')

    // Preparar datos geográficos
    const areaFeature = new GeoJSON().readFeature(mapInteractionStore.drawnArea)
    const drawnPolygon = turfPolygon(areaFeature.getGeometry().getCoordinates())
    const layerBbox = bbox(drawnPolygon)
    const [minX, minY, maxX, maxY] = layerBbox
    const bboxParam = `${minX},${minY},${maxX},${maxY},EPSG:4326`

    const getLayerData = async (layerName) => {
      if (import_layers_store.isImported(layerName)) {
        let file = import_layers_store.getFile(layerName)
        try {
          const layer = await getLayer_imported(
            layerName,
            file,
            file.name.split('.')[1] == 'geojson' ? 'geojson' : 'gpkg'
          )
          const bboxPoly = bboxPolygon(layerBbox)
          return {
            ...layer,
            features: layer.features.filter((feature) => booleanIntersects(feature, bboxPoly))
          }
        } catch (error) {
          console.error('Error loading imported layer:', error)
          throw error
        }
      } else {
        // Para Land-Sea Interactions, usar el datastore específico
        const datastore = 'ReMAP_intersection_LandSea'
        return await getLayerWFS(layerName, bboxParam, datastore)
      }
    }

    // Obtener datos de las capas
    showTemporaryAlert('Loading layer data...', 'info')
    const [layer1Data, layer2Data] = await Promise.all(
      selectedLayers.value.map(async (layerName) => await getLayerData(layerName))
    )

    // Validar que hay datos
    if (!layer1Data?.features?.length || !layer2Data?.features?.length) {
      throw new Error('One or both layers have no features in the selected area')
    }

    // Crear y configurar Web Worker específico para Land-Sea
    try {
      intersectionWorker = createLandSeaIntersectionWorker()
      console.log('[Setting] Land-Sea Worker created successfully')
    } catch (error) {
      console.error('[Setting] Failed to create Land-Sea worker:', error)
      showTemporaryAlert('Error creating worker for Land-Sea intersection calculation', 'error')
      cleanupWorker()
      return
    }

    // Generar nombre único para esta intersección
    const intersectionName = `Land-Sea Intersection ${Date.now()}`
    
    // Configurar listener del worker
    intersectionWorker.onmessage = (event) => {
      const message = event.data
      console.log('[Setting] Land-Sea Worker message received:', message.type, message)
      
      switch (message.type) {
        case 'progress':
          progressValue.value = message.value
          console.log('[Setting] Land-Sea Progress updated:', progressValue.value)
          break
          
        case 'partial':
          // Enviar features parciales al Visor con nombre consistente
          layers_store.addPartialIntersectionFeatures({
            features: message.features,
            layerName: intersectionName,
            isLandSea: true // Flag para identificar que es Land-Sea
          })
          break
          
        case 'done':
          if (message.total === 0) {
            showTemporaryAlert('No Land-Sea intersections found between the selected layers in the drawn area.', 'warning')
          } else {
            showTemporaryAlert(`Land-Sea intersection completed! Found ${message.total} intersections with buffer zones.`, 'success')
            // Para Land-Sea, no necesitamos el mapeo adicional de propiedades como en Conservation
            // ya que las propiedades se establecen directamente en el worker
          }
          cleanupWorker()
          break
          
        case 'error':
          console.error('Land-Sea Worker error:', message.error)
          showTemporaryAlert(`Land-Sea Error: ${message.error}`, 'error')
          cleanupWorker()
          break
      }
    }

    intersectionWorker.onerror = (error) => {
      console.error('Land-Sea Worker error:', error)
      showTemporaryAlert('Error initializing Land-Sea intersection calculation', 'error')
      cleanupWorker()
    }

    // Enviar datos al worker
    const workerPayload = {
      layer1: layer1Data, // Coastal layer
      layer2: layer2Data, // Marine layer  
      drawnArea: JSON.parse(new GeoJSON().writeFeature(areaFeature))
    }

    intersectionWorker.postMessage({
      cmd: 'RUN',
      payload: workerPayload
    })

    showTemporaryAlert('Calculating Land-Sea intersections with buffer zones in background...', 'info')

  } catch (error) {
    console.error('Error in Land-Sea intersection:', error)
    showTemporaryAlert(`Land-Sea Error: ${error.message}`, 'error')
    cleanupWorker()
  }
}

const submitFullRequest = async () => {
  if (email.value && selectedLayers.value.length === 2) {
    isLoading.value = true
    showTemporaryAlert(
      'Your request is being processed. Processing may take several minutes.',
      'info'
    )
    try {
      const module = route.name
      await requestFullOfflineIntersection(selectedLayers.value, email.value, module)
      showTemporaryAlert(
        'Request submitted successfully. You will be notified via email when it is ready.'
      )
      //console.log('Request submitted successfully. You will be notified when it is ready.')
    } catch (error) {
      showTemporaryAlert(
        error.message ||
          'Failed to submit request. It is possible that your layers do not meet the conditions for full intersection, please read the help section and try again.',
        'error'
      )
      //console.log('Failed to submit request. Please try again: ', error)
    } finally {
      email.value = ''
      isLoading.value = false
    }
  }
}

const getLayers = () => {
  let res = layers_store.list_layers.filter((layer) => layer !== 'mspzoningpoly')
  res = res.filter((layer) =>{
    let datastore=layers_store.getDatastoreByLayer(layer)
    if(datastore){
      switch(datastore){
        case 'postgis':
        case 'postgis_remap_test':
        case 'MSP':
        case 'base+de+datos':
          return layer;
      }
    }else{
      if(import_layers_store.isImported(layer) && import_layers_store.checkTypeLayer(layer) === 'input')  return layer;
    }
    });
  return res;
}

onMounted(async() => {
  if (route.name == 'es') {
    title.value = 'Filter by:'
  } else if (route.name == 'msp') {
    title.value = 'MSP and MPA Geoprocessing'
    disabled.value=false;
    await layers_store.getDatastores();
  } else {
    title.value = 'MSP and Coastal Geoprocessing'
    list_operations.value = ['Buffer'];
    await layers_store.getDatastores();
  }
})

// Limpiar worker al desmontar componente
onUnmounted(() => {
  cleanupWorker()
  popup_store.tokenDrawSetting=false
})
</script>

<template>
  <div v-if="popup_store.list_active[props.id]" id="setting" class="pop_up_layers popUp_visor" @mousedown="startDrag" @mouseup="stopDrag" >
    <v-card class="content_setting">
      <template v-slot:title>
        <HeaderPopUp :title="title" :id="props.id" :disabled="isProcessing"></HeaderPopUp>
      </template>
      <!--SE HA DESACTIVADO PARA LAND SEA INTERACTIONS TEMPORALMENTE -->
      <v-card-text v-if="route.name != 'es' && (!disabled || isProcessing)">
        <div v-if="!selectedOperation">
          <h3 class="mb-4">
            Select <span style="text-transform: lowercase">{{ title }}</span> type:
          </h3>
          <div class="d-flex flex-column gap-3">
            <v-btn color="primary" class="mb-2" @click="partial(e)" prepend-icon="mdi-selection-drag">
              Local analysis
               <!-- - {{ title }} -->
              <v-tooltip location="bottom">Requires: 1. Draw area 2. Select layers</v-tooltip>
            </v-btn>
            <!-- <v-btn color="secondary" @click="unavailable_store.setActive(true);" prepend-icon="mdi-cloud-download"> -->
            <v-btn color="secondary" @click="selectedOperation = 'offline'" prepend-icon="mdi-cloud-download">
              Full Offline
              <v-tooltip location="bottom">Requires: Select layers and provide email</v-tooltip>
            </v-btn>
            <div class="info d-flex flex-column information_option">
            <h3>Local analysis: <span class="descript">this option allows to select the geographical area (draw a polygon) 
              to analyse the (in)compatibility of MPAs and maritime uses. Can take a few minutes and is done 
              in real time on your computer.</span>
            </h3>
            <v-divider></v-divider>
            <h3>
              Full Offline: <span class="descript">
                this function processes complete layers. It is done on the server and can take 
                some time. When your request is accepted  finished, a message will be shown on the screen and 
                the result will be sent by email with a temporal download link emailed to you. You can then 
                import the layer and view it on the module with the styles applied. 
              </span>
            </h3>
            </div>
          </div>
        </div>

        <div v-else>
          
          <div class="d-flex flex-row align-start">
            <v-btn  
              variant="text"  
              icon="mdi-arrow-left" 
              @click="selectedOperation = null; selectedLayers = []; popup_store.tokenDrawSetting=false" 
              class="mb-4"
              :disabled="isProcessing"
            ></v-btn>
            <InfoFeedback :info="`To get more information about the layers, go to 'Layers' and click on the layer information.`"></InfoFeedback>
          </div>
          <div v-if="selectedOperation === 'partial'">
            <v-stepper 
              :items="['Draw Area', 'Select Layers', 'Execute']"
              :disabled="isProcessing"
            >
              <template v-slot:[`item.1`]>
                <div
                  class="step-content"
                  :class="{ 'step-completed': mapInteractionStore.drawnArea }"
                >
                  <h4>Step 1: Draw Area on Map</h4>
                  <p v-if="!mapInteractionStore.drawnArea">
                    <v-icon color="warning">mdi-alert</v-icon>
                    Use the drawing tools in the map to select your area of interest
                  </p>
                  <p v-else class="text-success">
                    <v-icon color="success">mdi-check-circle</v-icon>
                    Area selected!
                  </p>
                </div>
              </template>

              <template v-slot:[`item.2`]>
                <div class="step-content" :class="{ 'step-completed': selectedLayers.length === 2 }" >
                  <h4>Step 2: Select Two Layers</h4>
                  <InfoFeedback info="If you don't show the layer that you want it, check in the menu 'Layers'. You must to select the Server before of geoprocessing. "></InfoFeedback>
                  <v-list>
                    <v-list-item v-for="layer in getLayers()" :key="layer" @click="mapInteractionStore.drawnArea && toggleLayer(layer)" :disabled="!mapInteractionStore.drawnArea" class="text_layer" >
                      <template v-slot:prepend>
                        <div class="selection-number" :class="{ selected: getLayerNumber(layer) }">
                          {{ getLayerNumber(layer) }}
                        </div>
                      </template>
                      <v-list-item-title>{{ layer }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </div>
              </template>

              <template v-slot:[`item.3`]>
                <div class="step-content">
                  <h4>Step 3: Execute {{ title }}</h4>
                  
                  <!-- Botones de acción -->
                  <div class="action-buttons" style="margin-bottom: 16px;">
                    <!-- Botón para Land-Sea Interactions -->
                    <v-btn 
                      v-if="route.name === 'lsi'"
                      :disabled="!mapInteractionStore.drawnArea || selectedLayers.length !== 2 || isProcessing" 
                      :loading="isProcessing"
                      @click.stop.prevent="handleLandSeaIntersection" 
                      color="primary" 
                    >
                      Run Land-Sea Buffer {{ title }}
                    </v-btn>
                    
                    <!-- Botón para otros módulos (Conservation, Ecosystem Services) -->
                    <v-btn 
                      v-else
                      :disabled="!mapInteractionStore.drawnArea || selectedLayers.length !== 2 || isProcessing" 
                      :loading="isProcessing"
                      @click.stop.prevent="handlePartialIntersection" 
                      color="primary" 
                    >
                      Run Partial {{ title }}
                    </v-btn>
                    
                    <v-btn 
                      v-if="canCancel"
                      @click="cancelIntersection"
                      color="error"
                      variant="outlined"
                      style="margin-left: 8px;"
                    >
                      Cancel
                    </v-btn>
                  </div>
                  
                  <!-- Barra de progreso -->
                  <div v-if="showProgress" class="progress-section">
                    <div class="progress-info" style="margin-bottom: 8px;">
                      <span style="font-size: 14px; color: #666;">
                        Processing intersection... {{ progressValue }}%
                      </span>
                    </div>
                    <v-progress-linear
                      :model-value="progressValue"
                      color="primary"
                      height="6"
                      rounded
                    ></v-progress-linear>
                  </div>
                </div>
              </template>
            </v-stepper>
          </div>

          <div v-else-if="selectedOperation === 'offline'">
            <v-stepper 
              :items="['Select Layers', 'Provide Email']"
              :disabled="isLoading"
            >
              <template v-slot:[`item.1`]>
                <div
                  class="step-content"
                  :class="{ 'step-completed': selectedLayers.length === 2 }"
                >
                  <h4>Step 1: Select Two Layers</h4>
                  <v-list>
                    <v-list-item
                      v-for="layer in getLayers()"
                      :key="layer"
                      @click="toggleLayer(layer)"
                    >
                      <template v-slot:prepend>
                        <div class="selection-number" :class="{ selected: getLayerNumber(layer) }">
                          {{ getLayerNumber(layer) }}
                        </div>
                      </template>
                      <v-list-item-title>{{ layer }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </div>
              </template>

              <template v-slot:[`item.2`]>
                <div class="step-content">
                  <h4>Step 2: Provide Email Address</h4>
                  <v-text-field
                    v-model="email"
                    label="Notification email"
                    type="email"
                    outlined
                    class="mt-4"
                  ></v-text-field>
                  <v-btn
                    color="primary"
                    :disabled="selectedLayers.length !== 2 || !email || isLoading"
                    :loading="isLoading"
                    @click="submitFullRequest"
                  >
                    Submit Request
                  </v-btn>
                </div>
              </template>
            </v-stepper>
          </div>
        </div>
      </v-card-text>
      <v-card-text v-else>
        <ContentVersionES />
      </v-card-text>
      <v-alert v-if="showAlert" class="custom-alert" :type="alertType" closable>
        {{ alertMessage }}
      </v-alert>
      <AlertInfoUnavailable></AlertInfoUnavailable>
    </v-card>
    <!-- <AlertGeneral  title="Suggestion" text="Download before you request a new calculation / process to save your results. After, you can import the layer to continue working with it"></AlertGeneral> -->
  </div>
</template>

<style scoped>
#setting {
  width: 450px;
}
.content_setting {
  min-height: 500px;
  max-height: 600px;
}
.information_option{
  margin-top: 10px !important;
  border-radius: 10px;
  padding: 5px ;
  border: 1px solid;
}
.information_option * {
  font-weight: 600;
}
.descript{
  font-size: 14px;
  font-weight: normal;
}
.selection-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  transition: all 0.2s ease;
}

.selection-number.selected {
  background-color: #00a6cb;
  color: white;
}

.button-group {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.label-layer {
  font-size: 0.9rem;
  font-weight: 500;
}

.layer-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.v-list-item {
  padding: 8px 0;
}

.v-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.v-btn:disabled {
  opacity: 0.75;
}
.custom-alert {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 300px;
  text-align: center;
}
.step-content {
  height: 250px;
  overflow-y: auto;
}
.text_layer {
  word-break: break-all;
  width: 300px;
}
</style>
