<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import LoadingInfo from '@/components/utils/LoadingInfo.vue'

import imgReMap from "@/assets/logoRemap.png";
import imgUlpgc from "@/assets/logo-528.png";

import 'ol/ol.css' // Importar los estilos de OpenLayers
import OLMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import { TileWMS } from 'ol/source.js'
import { toLonLat, transformExtent, fromLonLat } from 'ol/proj.js'
import GeoJSON from 'ol/format/GeoJSON'
import Draw from 'ol/interaction/Draw'
import CircleStyle from 'ol/style/Circle'
import { Style, Fill, Stroke } from 'ol/style'
import intersect from '@turf/intersect'
import { flatten } from '@turf/flatten'
import { polygon as turfPolygon, featureCollection } from '@turf/helpers'

import { getAttributesLayer, getLayer_imported } from '@/services/service'
import { usePopUpNavbarStore } from '@/store/PopUpNavbarStore'
import { useLayersStore } from '@/store/LayersStore.js'
import { useAttributesLayersStore } from '@/store/AttributeLayerStore.js'
import { useImportLayersStore } from '@/store/ImportLayersStore'
import { useMapInteractionStore } from '@/store/MapInteractionStore'
import { clip } from "@/workers/clip.js";
import { useLoadingStore } from '@/store/LoadingStore'
import { mappingLayerResultsConservation, styleFunction, styleFunction_landsea } from '@/module/mapping'

const MAX_FEATURES = 500



const props = defineProps({
  rail: Boolean
})
const route= useRoute();
const layers_store = useLayersStore()
const import_layers_store = useImportLayersStore()
const attributes_layers_store = useAttributesLayersStore()
const popup_store = usePopUpNavbarStore()
const mapInteractionStore = useMapInteractionStore();
const loadingStore = useLoadingStore();

const geoserver = import.meta.env.VITE_GEOSERVER
const emodnet = import.meta.env.VITE_EMODNET
const mapElement = ref(null)

const drawVectorSource = new VectorSource()
const drawVectorLayer = new VectorLayer({
  source: drawVectorSource,
  style: new Style({
    fill: new Fill({
      color: 'rgba(255, 255, 0, 0.2)'
    }),
    stroke: new Stroke({
      color: '#ffcc33',
      width: 2
    })
  })
})
const drawInteraction = ref(null)

// Variables para manejar intersecciones parciales del Web Worker (fuera de reactive para evitar problemas)
let partialIntersectionLayers = new Map() // Mapea nombre de intersección -> VectorLayer
let partialIntersectionSources = new Map() // Mapea nombre de intersección -> VectorSource

// Referencias a las funciones de event listeners para poder removerlas
let partialIntersectionUpdateHandler = null
let partialIntersectionFinalizedHandler = null

// Buffer test variables and functions
const buffer_test = ref([])

// Función para asegurar que los Maps estén inicializados
const ensureMapsInitialized = () => {
  if (!partialIntersectionLayers || typeof partialIntersectionLayers.has !== 'function') {
    partialIntersectionLayers = new Map()
  }
  if (!partialIntersectionSources || typeof partialIntersectionSources.has !== 'function') {
    partialIntersectionSources = new Map()
  }
}

const createMap = () => {
  mapElement.value = new OLMap({
    target: mapElement.value,
    layers: [
      new TileLayer({
        source: new OSM()
      })
    ],
    view: new View({
      center: fromLonLat([10, 50]),
      zoom: 4.25
    })
  })
}
const clickPoint = () => {

  mapElement.value.on('singleclick', async (evt) => {
    if(route.name != 'es' && popup_store.list_active.setting) return
    const view = mapElement.value.getView()
    const viewResolution = view.getResolution()

    if (!mapElement.value.getLayers().item(1)) return
    let url=[];
    let list_layer_imported=[], list_layer_result=[];
    const activeLayers= mapElement.value.getLayers().getArray().filter(layer=> layer.get('name') || layer.getSource().get('name'));
    activeLayers.forEach((layer, index) => {
      const source = layer.getSource();
      if(source.get('result') || layer.get('result')){
        if(layer.get('name')){
          list_layer_result.push(layer.get('name'));
        }
        if(source.get('name')){
          list_layer_result.push(source.get('name'));
        }
        return;
      }
      if(layer.get('imported') || source.get('imported')){
        if(layer.get('name')){
          list_layer_imported.push(layer.get('name'));
        }
        if(source.get('name')){
          list_layer_imported.push(source.get('name'));
        }
      }else{
        if(!source instanceof TileWMS) return;
        let link= source.getFeatureInfoUrl(evt.coordinate, viewResolution, view.getProjection(), {
          INFO_FORMAT: 'application/json',
          Feature_count: 50,
          FORMAT: 'application/json'
        });
        if (link) url.push(link.split('?')[1]);
      }
    });
    attributes_layers_store.reset_attribute();

    attributes_layers_store.add_attributes_layers_imported(list_layer_imported, 
      toLonLat(evt.coordinate));
    attributes_layers_store.add_attributes_result_click(list_layer_result, 
      toLonLat(evt.coordinate));
    if(url.length===0) return;
    const urlParams = url.map(r => new URLSearchParams(r));
    const baseParams = new URLSearchParams(urlParams[0]);

    const layers = urlParams.map(p => p.get("LAYERS")).join(",");
    const queryLayers = urlParams.map(p => p.get("QUERY_LAYERS")).join(",");

    baseParams.set("LAYERS", layers);
    baseParams.set("QUERY_LAYERS", queryLayers);
    baseParams.delete("STYLES")
    let final_url= baseParams.toString();
    try {
      const response = await getAttributesLayer(final_url)
      attributes_layers_store.add_attributes(response);
    } catch (error) {
      console.error(`Error al obtener atributos de la capa ${index}:`, error)
    }
  })
}
const setupDrawInteraction = () => {
  if (drawInteraction.value) {
    mapElement.value.removeInteraction(drawInteraction.value)
  }

  drawInteraction.value = new Draw({
    source: drawVectorSource,
    type: 'Polygon',
    freehand: false
  })

  drawInteraction.value.on('drawstart', () => {
    drawVectorSource.clear()
    mapInteractionStore.clearDrawnArea()
  })

  drawInteraction.value.on('drawend', (event) => {
    const geoJSON = new GeoJSON().writeGeometry(event.feature.getGeometry(), {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    })
    mapInteractionStore.setDrawnArea(geoJSON)
  })

  watch(
    [() => popup_store.tokenDrawSetting],
    ([ token]) => {
      mapElement.value.addLayer(drawVectorLayer)
      if(route.name != 'es'){
        if (token) {
          if(popup_store.list_active.setting)  mapElement.value.addInteraction(drawInteraction.value)
        } else {
          mapElement.value.getLayers().getArray().forEach((existingLayer) => {
              if (existingLayer.get('name') === 'intersectionLayer') {
                mapElement.value.removeLayer(existingLayer)
              }
            })
          mapElement.value.removeInteraction(drawInteraction.value)
          drawVectorSource.clear()
          mapInteractionStore.clearDrawnArea()
        }
      }
    },
    { immediate: true }
  )
}
const addLayerTile = (layer) => {
  let wmsLayer = new TileLayer();
  let url = (layer == 'mspzoningpoly') ? emodnet : geoserver;
  let params = { LAYERS: layer, BBOX: getMapBBOX(), CRS: 'EPSG:4326', TILED: true };
  if(layers_store.filtered_attributes_layer.habitat.length >0 || layers_store.filtered_attributes_layer.ecosystem.length >0){
    params = { ...params, CQL_FILTER: getFilteredAttributes()};
  }
  if(layers_store.list_styles_layers_active[layer]){
    params = {...params, STYLES: layers_store.list_styles_layers_active[layer]};
  }
  wmsLayer.setSource(
    new TileWMS({
      url: url,
      params: params,
      serverType: 'geoserver',
      name:layer
    })
  )
  wmsLayer.set('name', layer)
  mapElement.value.addLayer(wmsLayer)
}

const getFilteredAttributes = () => {
  if(layers_store.filtered_attributes_layer.habitat.length == 0 && layers_store.filtered_attributes_layer.ecosystem.length == 0) {
    return '';
  }
  let field = "ecosystem_services", field2 = "referenceHabitatTypeId";
  let query = layers_store.filtered_attributes_layer.ecosystem
    .map(v => `(${field} ='${v}' OR ${field} LIKE '${v},%' OR ${field} LIKE '%,${v}' OR ${field} LIKE '%,${v},%')`)
    .join(" AND ");
    let query2 = layers_store.filtered_attributes_layer.habitat
    .map(v => `${field2} ='${v}'`)
    .join(" OR ");
    console.log("query ecosistema", query, query2);
  return query + (query && query2 ? " AND ( " : "") + query2 +  (query && query2 ? ") " : "");
}
const addLayerGeojson = (name_layer, layer) => {
  let vectorLayer;
  if(import_layers_store.list_type_files[name_layer] !== 'input'){
  vectorLayer = new VectorLayer({
    source: new VectorSource({
      features: new GeoJSON().readFeatures(layer, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      })
    }), 
    style: 
    (route.name=='msp')? styleFunction : 
      (route.name==='lsi')? styleFunction_landsea  :
      undefined
  })
  } else{
    vectorLayer = new VectorLayer({
    source: new VectorSource({
      features: new GeoJSON().readFeatures(layer, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      })
    })
  })
  }
  vectorLayer.set('name', name_layer.split('.')[0])
  vectorLayer.set('imported', true)

  mapElement.value.addLayer(vectorLayer)
  mapElement.value.getView().fit(
    vectorLayer.getSource().getExtent(), 
    { padding: [50, 50, 50, 50], maxZoom: 10 }
  );
}
const addLayer_Imported = async (name_layer) => {
  let file = import_layers_store.getFile(name_layer)
  let name_file_split = name_layer.split('.')
  // console.log(name_file_split, name_layer, file.name)
  try {
    const layer = await getLayer_imported(
      name_layer,
      file,
      file.name.split('.')[1] == 'geojson' ? 'geojson' : 'gpkg'
    )
    addLayerGeojson(name_layer, layer)
    attributes_layers_store.add_attributes_imported(layer, name_file_split[0])
  } catch (error) {
    console.error('Error al añadir la capa importada:', error)
  }
}
const addIntersectionLayer = async (intersection) => {
if (intersection?.data?.result?.type === 'FeatureCollection') {
  try {
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(intersection.data.result, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      })
    })
    vectorSource.set('name', intersection.name)
    vectorSource.set('result', true)

    const intersectionLayer = new VectorLayer({ source: vectorSource, style: styleFunction })
    intersectionLayer.set('name', intersection.name)
    intersectionLayer.set('result', true)

    mapElement.value.addLayer(intersectionLayer)

    // try fit once
    try {
      const extent = vectorSource.getExtent()
      if (extent && extent.every((v) => Number.isFinite(v))) {
        mapElement.value.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 10 })
      }
    } catch {}

    return
  } catch (e) {
    console.error('[Visor] Failed to render imported FeatureCollection', e)
  }
}

  // Verificar si es una intersección parcial del Web Worker
  if (intersection.isPartial || intersection.partialFeatures) {
    await handlePartialIntersectionLayer(intersection)
    return
  }

  // Modo tradicional (mantener compatibilidad)
  if (!intersection.data) return

  const [layer1, layer2] = intersection.data.layers
  const drawnArea = intersection.data.drawnArea

  const layer1Features = new GeoJSON().readFeatures(layer1)
  const layer2Features = new GeoJSON().readFeatures(layer2)
  const areaFeature = new GeoJSON().readFeature(drawnArea)
  let intersectionRes;
  if (route.name == 'msp'){
    intersectionRes = calculateIntersection(layer1Features, layer2Features, areaFeature)
    //Falta condición cuando no hay features
    if(intersectionRes.features.length === 0){
      alert("No se han encontrado resultados en la intersección de las capas seleccionadas.")
      mapInteractionStore.clearDrawnArea()
      drawVectorSource.clear()
      return;
    } else{
      intersectionRes.features= await mappingLayerResultsConservation(intersectionRes.features);
      attributes_layers_store.add_attributes_result(intersectionRes.features, intersection.name);
    }
  } else if(route.name == 'lsi'){
    //REVISAR ESTO CON AGUSTÍN
    // console.log("lsi", intersection, drawnArea)
    // intersectionRes = bufferWorker(JSON.parse(JSON.stringify(layer1.features)), JSON.parse(JSON.stringify(layer2.features)), 
    //                               JSON.parse(JSON.stringify(drawnArea)))
  }
  const vectorSource = new VectorSource({
    features: new GeoJSON().readFeatures(intersectionRes, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    })
  })
  vectorSource.set('name', intersection.name);
  vectorSource.set('result', true);
  const intersectionLayer = new VectorLayer({
    source: vectorSource,
    style: styleFunction
  })
  intersectionLayer.set('name', intersection.name);
  mapElement.value.addLayer(intersectionLayer)
  mapElement.value.getView().fit(
    intersectionLayer.getSource().getExtent(), 
    { padding: [50, 50, 50, 50], maxZoom: 10 }
  );
  mapInteractionStore.clearDrawnArea()
  drawVectorSource.clear()
}

// Nueva función para manejar intersecciones parciales del Web Worker
const handlePartialIntersectionLayer = async (intersection) => {
  // Asegurar que los Maps estén inicializados ANTES de usarlos
  ensureMapsInitialized()
  
  const intersectionName = intersection.name
  
  // Crear referencias locales frescas GARANTIZADAS - SIEMPRE nuevos Maps para evitar corrupción
  const currentLayers = new Map()
  const currentSources = new Map()
  
  // Copiar datos existentes si las variables globales son Maps válidos y tienen métodos
  if (partialIntersectionLayers instanceof Map && 
      typeof partialIntersectionLayers.entries === 'function' &&
      typeof partialIntersectionLayers[Symbol.iterator] === 'function') {
    try {
      for (const [key, value] of partialIntersectionLayers) {
        currentLayers.set(key, value)
      }
    } catch (error) {
      // Error silencioso - continuamos con Maps vacíos
    }
  }
  if (partialIntersectionSources instanceof Map && 
      typeof partialIntersectionSources.entries === 'function' &&
      typeof partialIntersectionSources[Symbol.iterator] === 'function') {
    try {
      for (const [key, value] of partialIntersectionSources) {
        currentSources.set(key, value)
      }
    } catch (error) {
      // Error silencioso - continuamos con Maps vacíos
    }
  }
  
  
  // Si la capa ya existe pero fue removida del mapa (p. ej., al desactivar el checkbox),
  // volver a agregarla sin recrearla.
  if (currentLayers.has(intersectionName)) {
    const existingLayer = currentLayers.get(intersectionName)
    const isInMap = mapElement.value.getLayers().getArray().includes(existingLayer)
    if (!isInMap) {
      mapElement.value.addLayer(existingLayer)
      console.log(`[Visor] Re-added existing partial intersection layer: ${intersectionName}`)
    }
  }
// Crear capa y fuente si no existen
  if (!currentLayers.has(intersectionName)) {
    const vectorSource = new VectorSource()
    vectorSource.set('name', intersectionName)
    vectorSource.set('result', true)
    
    const intersectionLayer = new VectorLayer({
      source: vectorSource,
      style: styleFunction
    })
    intersectionLayer.set('name', intersectionName)
    
    currentLayers.set(intersectionName, intersectionLayer)
    currentSources.set(intersectionName, vectorSource)
    
    // Actualizar las variables globales también
    partialIntersectionLayers = currentLayers
    partialIntersectionSources = currentSources
    
    // Agregar capa al mapa
    mapElement.value.addLayer(intersectionLayer)
    console.log(`[Visor] Created partial intersection layer: ${intersectionName}`)
  }
  
  // Si hay features parciales, agregarlas
  if (intersection.partialFeatures && intersection.partialFeatures.length > 0) {
    const vectorSource = currentSources.get(intersectionName)
    const features = new GeoJSON().readFeatures(
      { type: 'FeatureCollection', features: intersection.partialFeatures },
      {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }
    )
    
    // Agregar features a la fuente existente
    vectorSource.addFeatures(features)
    console.log(`[Visor] Added ${features.length} features to ${intersectionName}, total: ${vectorSource.getFeatures().length}`)
    
    // Ajustar vista si es la primera vez que agregamos features
    if (vectorSource.getFeatures().length === features.length) {
      mapElement.value.getView().fit(
        vectorSource.getExtent(),
        { padding: [50, 50, 50, 50], maxZoom: 10 }
      )
    }
  }
}

// Función para finalizar intersección parcial y aplicar mapeo de propiedades
const finalizePartialIntersection = async (intersectionName, totalFeatures, isLandSea = false, needsPropertyMapping = true) => {
  // Asegurar que los Maps estén inicializados
  ensureMapsInitialized()
  
  // Crear referencias locales frescas GARANTIZADAS - SIEMPRE nuevos Maps para evitar corrupción
  const currentSources = new Map()
  const currentLayers = new Map()
  
  // Copiar datos existentes si las variables globales son Maps válidos y tienen métodos
  if (partialIntersectionSources instanceof Map && 
      typeof partialIntersectionSources.entries === 'function' &&
      typeof partialIntersectionSources[Symbol.iterator] === 'function') {
    try {
      for (const [key, value] of partialIntersectionSources) {
        currentSources.set(key, value)
      }
    } catch (error) {
      // Error silencioso - continuamos con Maps vacíos
    }
  }
  if (partialIntersectionLayers instanceof Map && 
      typeof partialIntersectionLayers.entries === 'function' &&
      typeof partialIntersectionLayers[Symbol.iterator] === 'function') {
    try {
      for (const [key, value] of partialIntersectionLayers) {
        currentLayers.set(key, value)
      }
    } catch (error) {
      // Error silencioso - continuamos con Maps vacíos
    }
  }
  
  // Validación más robusta de parámetros de entrada
  if (!intersectionName || typeof intersectionName !== 'string') {
    return
  }

  const vectorSource = currentSources.get(intersectionName)
  if (!vectorSource) {
    // Validación adicional antes de usar métodos de Map
    const availableSources = (currentSources && typeof currentSources.keys === 'function') 
      ? Array.from(currentSources.keys()) 
      : []
    const sourcesCount = (currentSources && typeof currentSources.size === 'number') 
      ? currentSources.size 
      : 0
    return
  }
  
  try {
    // Obtener todas las features de la capa
    const allFeatures = vectorSource.getFeatures()
    
    if (allFeatures.length === 0) {
      return
    }
    
    // Solo aplicar mapeo de propiedades si es necesario (Conservation MSP)
    if (needsPropertyMapping && !isLandSea) {
      // Convertir features a GeoJSON para el mapeo de propiedades
      const geoJsonFeatures = allFeatures.map(feature => {
        const geoJsonFeature = new GeoJSON().writeFeatureObject(feature, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        })
        return geoJsonFeature
      })
      
      // Aplicar mapeo de propiedades (llamada al backend para colores)
      console.log(`[Visor] Starting property mapping for ${geoJsonFeatures.length} features`)
      const mappedFeatures = await mappingLayerResultsConservation(geoJsonFeatures)
      
      // Actualizar propiedades de las features existentes
      mappedFeatures.forEach((mappedFeature, index) => {
        if (allFeatures[index]) {
          // Actualizar propiedades de la feature en OpenLayers
          const olFeature = allFeatures[index]
          Object.keys(mappedFeature.properties).forEach(key => {
            olFeature.set(key, mappedFeature.properties[key])
          })
        }
      })
      
      // Agregar atributos al store
      attributes_layers_store.add_attributes_result(mappedFeatures, intersectionName)
      console.log(`[Visor] Property mapping completed for ${intersectionName}`)
      
    } else {
      // Para Land-Sea, las propiedades ya están establecidas en el worker
      console.log(`[Visor] Skipping property mapping for Land-Sea intersection: ${intersectionName}`)
      
      // Convertir features a formato compatible para atributos
      const geoJsonFeatures = allFeatures.map(feature => {
        const geoJsonFeature = new GeoJSON().writeFeatureObject(feature, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        })
        return geoJsonFeature
      })
      
      // Agregar atributos al store sin procesamiento adicional
      attributes_layers_store.add_attributes_result(geoJsonFeatures, intersectionName)
    }
    
    // Forzar re-renderizado de la capa
    const intersectionLayer = partialIntersectionLayers.get(intersectionName)
    if (intersectionLayer) {
      intersectionLayer.getSource().changed()
    }
    
    console.log(`[Visor] Finalization completed for ${intersectionName}`)
    
    // Limpiar área dibujada
    mapInteractionStore.clearDrawnArea()
    drawVectorSource.clear()
    
  } catch (error) {
    console.error(`[Visor] Error finalizing intersection ${intersectionName}:`, error)
  }
}

// Función para configurar listeners de eventos del Web Worker
const setupPartialIntersectionListeners = () => {
  // Definir handlers con referencias guardadas
  partialIntersectionUpdateHandler = (event) => {
    const { intersectionName, newFeatures, totalFeatures } = event.detail
    console.log(`[Visor] Received partial intersection update: ${intersectionName}, +${newFeatures.length} features, total: ${totalFeatures}`)
    
    // Buscar la intersección en el store
    const intersection = layers_store.intersections.find(i => i.name === intersectionName)
    if (intersection) {
      handlePartialIntersectionLayer(intersection)
    }
  }
  
  partialIntersectionFinalizedHandler = (event) => {
    const { intersectionName, totalFeatures, isLandSea, needsPropertyMapping } = event.detail
    console.log(`[Visor] Intersection finalized: ${intersectionName}, total: ${totalFeatures}, isLandSea: ${isLandSea}`)
    
    finalizePartialIntersection(intersectionName, totalFeatures, isLandSea, needsPropertyMapping)
  }
  
  // Agregar los listeners
  window.addEventListener('partialIntersectionUpdate', partialIntersectionUpdateHandler)
  window.addEventListener('partialIntersectionFinalized', partialIntersectionFinalizedHandler)
}

const getMapBBOX = () => {
  const view = mapElement.value.getView()
  const extent = view.calculateExtent(mapElement.value.getSize())
  const projection = view.getProjection()

  return transformExtent(extent, projection, 'EPSG:4326')
}
const removeLayerMap = (layer) => {
  mapElement.value
    .getLayers()
    .getArray()
    .forEach((existingLayer) => {
      const source = existingLayer.getSource()
      if (
        (source instanceof TileWMS && source.getParams()['LAYERS'] === layer) ||
        (source instanceof VectorSource && existingLayer.get('name') === layer)
      ) {
        mapElement.value.removeLayer(existingLayer)
      }
    })
}
const addLayerToMap = (layer) => {
  const intersection = layers_store.intersections.find(i => i.name === layer);
  if(intersection) {
    addIntersectionLayer(intersection);
  } else if (import_layers_store.list_name_layers.includes(layer)) {
    addLayer_Imported(layer)
  } else  {
    addLayerTile(layer)
  }
}
onMounted(() => {
  loadingStore.activeLoading();
  createMap()
  clickPoint()
  setupDrawInteraction()
  setupPartialIntersectionListeners()
  layers_store.list_active.forEach((layer) => {
    addLayerToMap(layer)
  })
  loadingStore.disactiveLoading();
})
// Limpiar listeners al desmontar
onUnmounted(() => {
  // Remover listeners correctamente usando las referencias guardadas
  try {
    if (partialIntersectionUpdateHandler) {
      window.removeEventListener('partialIntersectionUpdate', partialIntersectionUpdateHandler)
      partialIntersectionUpdateHandler = null
    }
    if (partialIntersectionFinalizedHandler) {
      window.removeEventListener('partialIntersectionFinalized', partialIntersectionFinalizedHandler)
      partialIntersectionFinalizedHandler = null
    }
    
    // Limpiar capas parciales - verificar que existan y sean válidas
    if (partialIntersectionLayers && typeof partialIntersectionLayers.clear === 'function') {
      partialIntersectionLayers.clear()
    }
    if (partialIntersectionSources && typeof partialIntersectionSources.clear === 'function') {
      partialIntersectionSources.clear()
    }
  } catch (error) {
    console.warn('Error during component cleanup:', error)
  }
})
watch(
  () => layers_store.list_active,
  (newLayers, oldLayers) => {
    loadingStore.activeLoading();
    if (!mapElement.value) return;
    oldLayers.forEach((oldLayer) => {
      if (!newLayers.includes(oldLayer)) {
        removeLayerMap(oldLayer)
      }
    })
    newLayers.forEach((layer) => {
      const layerExists = mapElement.value.getLayers().getArray()
        .some((existingLayer) => {
          const source = existingLayer.getSource()
          return (
            (source instanceof TileWMS && source.getParams()['LAYERS'] === layer) ||
            (source instanceof VectorSource && existingLayer.get('name') === layer)
          )
        })

      if (!layerExists) {
        addLayerToMap(layer)
      }
    })
    loadingStore.disactiveLoading();
  },
  { deep: true }
)

watch(
  () => layers_store.filtered_attributes_layer,
  () => {
    if (!mapElement.value || route.name != 'es') return;
    layers_store.list_active.forEach((layer) => {
      removeLayerMap(layer)
      addLayerTile(layer)
    })
  },
  { deep: true }
)

const calculateIntersection = (features1, features2, area) => {
  if (features1.length > MAX_FEATURES || features2.length > MAX_FEATURES) {
    throw new Error(`Maximum ${MAX_FEATURES} features per layer allowed`)
  }

  const normalizeGeometry = (feature) => {
    const geom = feature.geometry
    if (geom.type === 'MultiPolygon') {
      return flatten(geom).features // Divide MultiPolygon en Polygons
    }
    return [feature]
  }
  if (area.getGeometry().getType() !== 'Polygon') {
    throw new Error('El área dibujada debe ser un polígono')
  }
  const areaPolygon = turfPolygon(area.getGeometry().getCoordinates())

  const toTurfFeature = (olFeature) => {
    const geom = olFeature.getGeometry()
    if (!geom) return null

    const type = geom.getType()
    let properties=olFeature.getProperties();
    delete properties.geometry;
    return {
      type: 'Feature',
      geometry: {
        type: type,
        coordinates: geom.getCoordinates()
      },
      properties: properties
    }
  }

  const turfFeatures1 = features1.map(toTurfFeature).filter(Boolean)
  const turfFeatures2 = features2.map(toTurfFeature).filter(Boolean)

  const clipped1 = clip(turfFeatures1, areaPolygon).features
  const clipped2 = clip(turfFeatures2, areaPolygon).features

  const results = []

  for (const f1 of clipped1) {
    for (const f2 of clipped2) {
      const f1Polys = normalizeGeometry(f1)
      const f2Polys = normalizeGeometry(f2)

      for (const poly1 of f1Polys) {
        for (const poly2 of f2Polys) {
          const f1Polygon = turfPolygon(poly1.geometry.coordinates, poly1.properties)
          const f2Polygon = turfPolygon(poly2.geometry.coordinates, poly2.properties)
          const featuredCollection = featureCollection([f1Polygon, f2Polygon, areaPolygon])
          const layerIntersection = intersect(featuredCollection)
          if (layerIntersection) {
            layerIntersection.properties = {
              ...f1Polygon.properties,
              ...f2Polygon.properties
            }
            results.push(layerIntersection)
          }
        }
      }
    }
  }
  
  return {
    type: 'FeatureCollection',
    features: results
  }
}
</script>

<template>
  <div :class="['visor-container', { 'visor-shrunken': !props.rail }]">
    <div ref="mapElement" id="map" class="map"></div>
    <LoadingInfo id="loadingResources"/>
    <div class="logos">
      <img class="logo logo-ulpgc" :src="imgUlpgc" alt="ULPGC logo" />
      <img class="logo logo-remap" :src="imgReMap" alt="ReMap logo" />
    </div>
  </div>
</template>

<style scoped>
.visor-container {
  flex: 1;
  transition:
    margin-left 0.3s ease,
    width 0.3s ease;
}

.visor-shrunken {
  margin-left: 10%;
}
.map {
  width: 100%;
  height: 100vh;
}
#loadingResources {
  position: absolute;
  bottom: 2.5%;
  right: 1.25%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

.logos{
  position: absolute;
  bottom: 1%;
  right: 1%;
  z-index: 3000; /* asegurar por encima del mapa */
  display: flex;
  gap: 8px;
  align-items: center;
  pointer-events: auto;
}
.logo{
  height: 48px;
  width: auto;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}
</style>
