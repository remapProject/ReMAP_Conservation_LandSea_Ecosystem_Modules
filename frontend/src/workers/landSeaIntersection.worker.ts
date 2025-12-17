import * as turf from '@turf/turf'
import { getActivitiesLandSea, getTableLandSea } from '../services/service'
import { clip } from './clip'

// Tipos de mensajes
interface RunMessage {
  cmd: 'RUN'
  payload: {
    layer1: any // Primera capa (coastal)
    layer2: any // Segunda capa (marine)
    drawnArea: any // Área dibujada por el usuario
  }
}

interface AbortMessage {
  cmd: 'ABORT'
}

type WorkerMessage = RunMessage | AbortMessage

interface ProgressMessage {
  type: 'progress'
  value: number // 0-100
}

interface PartialMessage {
  type: 'partial'
  features: any[]
}

interface DoneMessage {
  type: 'done'
  total: number
}

interface ErrorMessage {
  type: 'error'
  error: string
}

type WorkerResponse = ProgressMessage | PartialMessage | DoneMessage | ErrorMessage

// Variables globales
let isAborted = false
let currentMaxProgress = 0

// Función para envío de progreso monotónico
function sendProgress(progress: number) {
  if (progress > currentMaxProgress) {
    currentMaxProgress = progress
    postMessage({ type: 'progress', value: progress } as ProgressMessage)
  }
}

// Configuración de límites
const DEFAULT_POLYGON_LIMIT = 1000
const BATCH_SIZE = 50 // Features por lote

// Validación de atributos hilucsmsp
function validateHilucsMSP(features: any[]): boolean {
  if (!features || features.length === 0) return false
  
  const firstFeature = features[0]
  if (!firstFeature || !firstFeature.properties) return false
  
  const hilucsmspValue = getHilucsMSP(firstFeature.properties)
  return hilucsmspValue !== null && hilucsmspValue !== ""
}

// Obtener valor hilucsmsp (normalizado, case-insensitive)
function getHilucsMSP(properties: any): string {
  if (!properties) return ""
  
  const normalizedKey = Object.keys(properties).find(
    (key) => key.toLowerCase().replace(/\\s+/g, "") === "hilucsmsp"
  )
  return normalizedKey ? properties[normalizedKey] : ""
}

// Obtener actividad desde hilucsmsp
function getActivity(activity: string): string {
  if (!activity || activity === null) return ""
  
  const actividad = activity.split('/')
  const name = actividad[actividad.length - 1]
  return name.slice(0, name.length - 5)
}

// Verificar si una actividad está en la lista
function flagActivity(nameActivity: string, list: string[]): boolean {
  if (!nameActivity || !list) return false
  
  let flag = false
  const normalizedActivity = nameActivity.toLowerCase()
  
  list.forEach((item) => {
    let normalizedItem = item.toLowerCase()
    if (normalizedItem.includes('*')) {
      normalizedItem = normalizedItem.split('*')[0].trim()
    }
    if (normalizedItem.includes(normalizedActivity)) {
      flag = true
    }
  })
  
  return flag
}

// Filtrar features por actividades válidas
function getFeaturesActivities(listFeatures: any[], listActivities: string[]): any[] {
  const result = []
  
  for (const feature of listFeatures) {
    const hilucs = getHilucsMSP(feature.properties)
    const nameActivity = getActivity(hilucs)
    
    if (!nameActivity || nameActivity === null) continue
    
    if (flagActivity(nameActivity, listActivities)) {
      result.push(feature)
    }
  }
  
  return result
}

// Dividir multipolygons en polygons individuales
function flattenFeatures(features: any[]): any[] {
  const flattened = []
  
  for (const feature of features) {
    if (feature.geometry.type === 'MultiPolygon') {
      // Dividir multipolygon en polygons individuales
      for (const coordinates of feature.geometry.coordinates) {
        const newFeature = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: coordinates
          },
          properties: { ...feature.properties } // Mantener propiedades originales
        }
        flattened.push(newFeature)
      }
    } else {
      flattened.push(feature)
    }
  }
  
  return flattened
}

// Obtener configuración de buffer
function getBuffer(emodnet: string, coastal: string, table: any, tableTypeMarine: any): any {
  const typeMarine = Object.entries(tableTypeMarine).find(([activity]) => {
    const cleanActivity = activity.includes('*') ? activity.split('*')[0].trim() : activity
    return cleanActivity.includes(emodnet)
  })?.[1] ?? null
  
  if (!typeMarine || !table[typeMarine as string] || !table[typeMarine as string][coastal]) {
    return null
  }
  
  return table[typeMarine as string][coastal]
}

// Crear buffer y verificar intersección
function createBufferAndIntersect(emodnetFeature: any, coastalFeature: any, bufferValues: any): any[] {
  const results = []
  
  if (!bufferValues) return results
  
  Object.entries(bufferValues).forEach(([key, type]: [string, any]) => {
    Object.entries(type).forEach(([keyType, value]: [string, any]) => {
      const numbers = value.match(/\\d+/g)
      if (numbers) {
        const bufferValue = parseInt(numbers[0], 10)
        
        try {
          // Crear buffer
          const bufferMarine = turf.buffer(emodnetFeature, bufferValue, { units: 'meters' })
          
          // Verificar intersección
          if (turf.booleanIntersects(bufferMarine, coastalFeature)) {
            // Limpiar propiedades problemáticas
            delete coastalFeature.bbox
            
            // Calcular intersección
            const intersection = turf.intersect(turf.featureCollection([coastalFeature, bufferMarine]))
            
            if (intersection) {
              intersection.properties = {
                ...emodnetFeature.properties,
                ...coastalFeature.properties,
                type_buffer: key + '_' + keyType,
                buffer_value: bufferValue
              }
              
              results.push(intersection)
            }
          }
        } catch (error) {
          console.warn('Error creating buffer or intersection:', error)
        }
      }
    })
  })
  
  return results
}

// Función principal de procesamiento
async function processLandSeaIntersection(payload: RunMessage['payload']) {
  const { layer1, layer2, drawnArea } = payload
  
  try {
    currentMaxProgress = 0
    
    // Fase 1: Validaciones iniciales (0-5%)
    sendProgress(1)
    
    // Validar atributos hilucsmsp
    if (!validateHilucsMSP(layer1.features)) {
      throw new Error('Layer 1 does not have required hilucsmsp attribute')
    }
    
    if (!validateHilucsMSP(layer2.features)) {
      throw new Error('Layer 2 does not have required hilucsmsp attribute')
    }
    
    sendProgress(3)
    
    // Fase 2: Recortar según área dibujada (5-10%)
    const clippedLayer1 = clip(layer1.features, drawnArea)
    const clippedLayer2 = clip(layer2.features, drawnArea)
    
    sendProgress(7)
    
    // Fase 3: Obtener datos de servicios (10-15%)
    const { Marine: listMarine, Coastal: listCoastal } = await getActivitiesLandSea()
    const { table: tableLandSea, types_marine: tableTypeMarine } = await getTableLandSea()
    
    sendProgress(12)
    
    // Fase 4: Filtrar por actividades válidas (15-20%)
    const coastalFeatures = getFeaturesActivities(clippedLayer1.features, listCoastal)
    const marineFeatures = getFeaturesActivities(clippedLayer2.features, listMarine)
    
    sendProgress(17)
    
    // Fase 5: Aplanar multipolygons (20-25%)
    const flattenedCoastal = flattenFeatures(coastalFeatures)
    const flattenedMarine = flattenFeatures(marineFeatures)
    
    sendProgress(22)
    
    // Validar límite de polígonos
    const totalPolygons = flattenedCoastal.length + flattenedMarine.length
    if (totalPolygons > DEFAULT_POLYGON_LIMIT) {
      throw new Error(`Too many polygons (${totalPolygons}). Limit is ${DEFAULT_POLYGON_LIMIT}. Please select a smaller area or fewer features.`)
    }
    
    sendProgress(25)
    
    console.log(`[Worker] Processing ${flattenedCoastal.length} coastal features with ${flattenedMarine.length} marine features`)
    
    // Fase 6: Procesamiento principal - doble bucle (25-95%)
    const totalCombinations = flattenedCoastal.length * flattenedMarine.length
    let processedCount = 0
    let resultFeatures: any[] = []
    let batchFeatures: any[] = []
    
    for (let i = 0; i < flattenedMarine.length && !isAborted; i++) {
      const marineFeature = flattenedMarine[i]
      const marineActivity = getActivity(getHilucsMSP(marineFeature.properties))
      
      for (let j = 0; j < flattenedCoastal.length && !isAborted; j++) {
        const coastalFeature = flattenedCoastal[j]
        const coastalActivity = getActivity(getHilucsMSP(coastalFeature.properties))
        
        try {
          // Obtener configuración de buffer
          const bufferValues = getBuffer(marineActivity, coastalActivity, tableLandSea, tableTypeMarine)
          
          if (bufferValues) {
            // Crear buffer e intersecciones
            const intersections = createBufferAndIntersect(marineFeature, coastalFeature, bufferValues)
            
            if (intersections.length > 0) {
              batchFeatures.push(...intersections)
              resultFeatures.push(...intersections)
            }
          }
          
          processedCount++
          
          // Enviar lote parcial cuando se alcanza el tamaño del batch
          if (batchFeatures.length >= BATCH_SIZE) {
            postMessage({
              type: 'partial',
              features: [...batchFeatures]
            } as PartialMessage)
            
            batchFeatures = [] // Limpiar batch
          }
          
          // Actualizar progreso
          if (processedCount % 100 === 0 || processedCount === totalCombinations) {
            const progress = Math.min(95, 25 + (processedCount / totalCombinations) * 70)
            sendProgress(Math.floor(progress))
            console.log(`[Worker] Progress: ${Math.floor(progress)}% (${processedCount}/${totalCombinations})`)
          }
          
        } catch (error) {
          console.warn(`Error processing combination ${i},${j}:`, error)
          processedCount++
        }
      }
    }
    
    // Fase 7: Finalización (95-100%)
    sendProgress(95)
    
    // Enviar último lote si hay features pendientes
    if (batchFeatures.length > 0 && !isAborted) {
      postMessage({
        type: 'partial',
        features: [...batchFeatures]
      } as PartialMessage)
    }
    
    if (!isAborted) {
      sendProgress(100)
      postMessage({ type: 'done', total: resultFeatures.length } as DoneMessage)
      console.log(`[Worker] Completed: ${resultFeatures.length} intersection features found`)
    }
    
  } catch (error: any) {
    postMessage({
      type: 'error',
      error: `Processing error: ${error.message}`
    } as ErrorMessage)
  }
}

// Manejador de mensajes
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  switch (message.cmd) {
    case 'RUN':
      isAborted = false
      console.log('[Worker] Starting Land-Sea intersection calculation...')
      processLandSeaIntersection(message.payload)
      break

    case 'ABORT':
      isAborted = true
      console.log('[Worker] Land-Sea intersection calculation aborted')
      break

    default:
      postMessage({
        type: 'error',
        error: 'Unknown command'
      } as ErrorMessage)
  }
}

// Exportar tipos para uso en el main thread
export type { WorkerMessage, WorkerResponse }