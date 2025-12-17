import { getListDatastores, getLayersDatastore } from '@/services/service'
import { defineStore } from 'pinia'
import { ref } from 'vue'
const list_name_server = ['ULPGC-ECOAQUA']

export const useLayersStore = defineStore('layersStore', () => {
  const list_layers = ref([])
  const list_active = ref([])
  const list_server = ref(list_name_server)
  const list_geoserver = ref([])
  const intersectionLayer = ref(null)
  const originalLayers = ref([])
  const intersections = ref([])
  const filtered_attributes_layer= ref({"habitat": [], "ecosystem": []});
  const list_styles_layers= ref([]);
  const list_styles_layers_active = ref([]);
  const datastores = ref({});
  const list_name_datastores = ref([]);
  let intersectionCounter = 1
  
  const reset_list = () => {
    list_layers.value = []
    list_active.value = []
    list_server.value = list_name_server
    list_geoserver.value = []
  }

  const add_layers_geoserver = (list) => {
    if (!list || !Array.isArray(list)) {
      const errorMsg = `add_layers_geoserver: list is not a valid array, received: ${typeof list}`
      console.warn(errorMsg, list)
      return
    }
    list.forEach((element) => {
      if (!list_geoserver.value.includes(element)) list_geoserver.value.push(element)
    })
  }
  const add_layers = (list) => {
    if (!list || !Array.isArray(list)) {
      const errorMsg = `add_layers: list is not a valid array, received: ${typeof list}`
      console.warn(errorMsg, list)
      return
    }
    list.forEach((element) => {
      add_layer(element)
    })
  }
  const add_layer = (name_layer) => {
    if (!list_layers.value.includes(name_layer)) list_layers.value.push(name_layer)
  }
  const add_server = () => {
    if(!list_server.value.includes(`imported Local`)) list_server.value.push(`imported Local`)
  }
  const remove_layers_geoserver = () => {
    list_geoserver.value.forEach((element) => {
      remove_layer(element)
    })
  }
  const remove_layers = (list) => {
    list.forEach((element) => {
      remove_layer(element)
    })
  }

  const remove_layer = (name_layer) => {
    if (list_layers.value.includes(name_layer))
      list_layers.value.splice(list_layers.value.indexOf(name_layer), 1)
  }

  const setIntersectionLayers = (data) => {
    const intersectionName = `Partial Intersection ${intersectionCounter++}`
    const newIntersection = {
      id: Date.now(),
      name: intersectionName,
      group: 'results',
      visible: true,
      data: data
    }

    intersections.value.push(newIntersection)
    list_active.value.push(intersectionName)
  }

  // Nueva función para manejar features parciales del Web Worker
  const addPartialIntersectionFeatures = (partialData) => {
    // Buscar si ya existe una intersección en progreso o crear una nueva
    let currentIntersection = intersections.value.find(i => i.isPartial === true)
    
    if (!currentIntersection) {
      // Usar el nombre proporcionado o generar uno por defecto
      const intersectionName = partialData.layerName || `Partial Intersection ${intersectionCounter++}`
      currentIntersection = {
        id: Date.now(),
        name: intersectionName,
        group: 'results',
        visible: true,
        isPartial: true,
        isLandSea: partialData.isLandSea || false, // Flag para Land-Sea
        partialFeatures: [],
        data: null
      }
      
      intersections.value.push(currentIntersection)
      list_active.value.push(intersectionName)
    }
    
    // Agregar las nuevas features parciales
    if (partialData.features && partialData.features.length > 0) {
      currentIntersection.partialFeatures.push(...partialData.features)
      
      // Notificar al Visor que hay nuevas features disponibles
      window.dispatchEvent(new CustomEvent('partialIntersectionUpdate', {
        detail: {
          intersectionName: currentIntersection.name,
          newFeatures: partialData.features,
          totalFeatures: currentIntersection.partialFeatures.length,
          isLandSea: currentIntersection.isLandSea
        }
      }))
    }
  }

  // Función para finalizar una intersección parcial y prepararla para el mapeo de propiedades
  const finalizePartialIntersection = (intersectionName) => {
    const intersection = intersections.value.find(i => i.name === intersectionName)
    if (intersection && intersection.isPartial) {
      intersection.isPartial = false
      
      // Para Land-Sea, no necesitamos mapeo de propiedades ya que se establecen en el worker
      if (intersection.isLandSea) {
        intersection.needsPropertyMapping = false
      } else {
        intersection.needsPropertyMapping = true
      }
      
      // Notificar que la intersección está finalizada
      window.dispatchEvent(new CustomEvent('partialIntersectionFinalized', {
        detail: {
          intersectionName: intersection.name,
          totalFeatures: intersection.partialFeatures.length,
          isLandSea: intersection.isLandSea,
          needsPropertyMapping: intersection.needsPropertyMapping
        }
      }))
    }
  }

  const toggleIntersectionVisibility = (id, visible) => {
    const index = intersections.value.findIndex(i => i.id === id);
    if (index !== -1) {
      intersections.value[index].visible = visible;
      
      const listIndex = list_active.value.indexOf(intersections.value[index].name);
      if (visible && listIndex === -1) {
        list_active.value.push(intersections.value[index].name);
      } else if (!visible && listIndex !== -1) {
        list_active.value.splice(listIndex, 1);
      }
    }
  };

  const clearIntersection = () => {
    list_active.value = [...originalLayers.value]
    intersectionLayer.value = null
  }
  const getDatastores = async () => {
    try {
      const response = await getListDatastores();
      list_name_datastores.value = response;
      for (const datastore of response) {
        let group = await getLayersDatastore(datastore);
        if(group || group !== 'unknown' || group.length) datastores.value[datastore] = group;
      }
    } catch (error) {
      console.error('Error fetching datastores and layers:', error);
    }
  }
   const getDatastoreByLayer = (name_layer) => {
    for (const [clave, valores] of Object.entries(datastores.value)) {
      if (valores.includes(name_layer)) {
        return clave
      }
    }
    return null // o undefined, si prefieres
  }
  const addIntersectionFromResult = (name, featureCollection, options = {}) => {
  if (!featureCollection || featureCollection.type !== 'FeatureCollection') {
    console.warn('[LayersStore] addIntersectionFromResult: invalid FeatureCollection')
    return
  }
  const intersectionName = name || `Intersection ${Date.now()}`
  const newIntersection = {
    id: Date.now(),
    name: intersectionName,
    group: 'results',
    visible: true,
    isPartial: false,
    isLandSea: !!options.isLandSea,
    needsPropertyMapping: !!options.needsPropertyMapping,
    data: { result: featureCollection }
  }
  intersections.value.push(newIntersection)
  if (!list_active.value.includes(intersectionName)) {
    list_active.value.push(intersectionName)
  }
}

return {
    list_layers,
    list_active,
    list_server,
    filtered_attributes_layer,
    list_styles_layers,
    list_styles_layers_active,
    intersectionLayer,
    intersections,
    datastores,
    add_layers_geoserver,
    remove_layers_geoserver,
    add_layers,
    add_layer,
    reset_list,
    add_server,
    remove_layers,
    remove_layer,
    setIntersectionLayers,
    addPartialIntersectionFeatures,
    finalizePartialIntersection,
    toggleIntersectionVisibility,
    clearIntersection, 
    getDatastores, 
    getDatastoreByLayer
  }
})
