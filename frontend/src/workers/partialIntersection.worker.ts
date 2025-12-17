/// <reference lib="webworker" />

import * as turf from '@turf/turf'

// Tipos para los mensajes
interface RunMessage {
  cmd: 'RUN'
  payload: {
    layer1: any // FeatureCollection
    layer2: any // FeatureCollection
    drawnArea: any // Feature<Polygon>
  }
}

interface AbortMessage {
  cmd: 'ABORT'
}

type WorkerMessage = RunMessage | AbortMessage

interface ProgressMessage {
  type: 'progress'
  value: number
}

interface PartialMessage {
  type: 'partial'
  features: any[] // Feature[]
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

// Estado del worker
let isAborted = false
let currentMaxProgress = 0 // Para asegurar progreso monotónico

// Función para enviar progreso monotónico (solo hacia adelante)
function sendProgress(newProgress: number) {
  const progress = Math.floor(Math.max(currentMaxProgress, newProgress))
  if (progress > currentMaxProgress) {
    currentMaxProgress = progress
    postMessage({ type: 'progress', value: progress } as ProgressMessage)
    console.log(`[Worker] Progress: ${progress}%`)
  }
}

// Función para prefiltrar features por bbox y intersección básica
function prefilterFeatures(
  layer1: any,
  layer2: any,
  drawnArea: any
): { layer1Filtered: any[], layer2Filtered: any[] } {
  try {
    const drawnBbox = turf.bbox(drawnArea)
    const drawnBboxPoly = turf.bboxPolygon(drawnBbox)

    const layer1Filtered = layer1.features.filter(feature => {
      try {
        return turf.booleanIntersects(feature, drawnBboxPoly) && 
               turf.booleanIntersects(feature, drawnArea)
      } catch (error) {
        console.warn('Error filtering feature from layer1:', error)
        return false
      }
    })

    const layer2Filtered = layer2.features.filter(feature => {
      try {
        return turf.booleanIntersects(feature, drawnBboxPoly) && 
               turf.booleanIntersects(feature, drawnArea)
      } catch (error) {
        console.warn('Error filtering feature from layer2:', error)
        return false
      }
    })

    return { layer1Filtered, layer2Filtered }
  } catch (error) {
    throw new Error(`Error in prefiltering: ${error.message}`)
  }
}

// Función para calcular intersección entre dos features
function calculateFeatureIntersection(
  feature1: any,
  feature2: any,
  drawnArea: any
): any | null {
  try {
    // Intersección entre las dos features
    const intersection = turf.intersect(turf.featureCollection([feature1, feature2]))
    
    if (!intersection) return null

    // Clip con el área dibujada
    const clippedIntersection = turf.intersect(turf.featureCollection([intersection, drawnArea]))
    
    if (!clippedIntersection) return null

    // Combinar propiedades de ambas features
    const combinedProperties = {
      ...feature1.properties,
      ...feature2.properties,
      properties1: feature1.properties,
      properties2: feature2.properties
    }

    clippedIntersection.properties = combinedProperties

    return clippedIntersection
  } catch (error) {
    console.warn('Error calculating intersection between features:', error)
    return null
  }
}

// Función principal de procesamiento
function processIntersection(payload: RunMessage['payload']) {
  const { layer1, layer2, drawnArea } = payload
  
  try {
    // Reiniciar progreso al inicio
    currentMaxProgress = 0
    
    // Fase 1: Prefiltrado (0-10%)
    sendProgress(5)
    const { layer1Filtered, layer2Filtered } = prefilterFeatures(layer1, layer2, drawnArea)
    
    console.log(`[Worker] Prefiltered: Layer1=${layer1Filtered.length}, Layer2=${layer2Filtered.length}`)
    sendProgress(10)
    
    if (layer1Filtered.length === 0 || layer2Filtered.length === 0) {
      sendProgress(100)
      postMessage({ type: 'done', total: 0 } as DoneMessage)
      return
    }

    const totalCombinations = layer1Filtered.length * layer2Filtered.length
    const batchSize = Math.min(200, Math.max(50, Math.floor(totalCombinations / 20))) // Entre 50-200 features por lote
    
    console.log(`[Worker] Processing ${totalCombinations} combinations (${layer1Filtered.length} × ${layer2Filtered.length})`)
    
    let processedCount = 0
    let resultFeatures: any[] = []
    let batchFeatures: any[] = []

    // Fase 2: Procesamiento principal (10-95%)
    sendProgress(15)

    // Procesar todas las combinaciones de features
    for (let i = 0; i < layer1Filtered.length && !isAborted; i++) {
      for (let j = 0; j < layer2Filtered.length && !isAborted; j++) {
        try {
          const intersection = calculateFeatureIntersection(
            layer1Filtered[i],
            layer2Filtered[j],
            drawnArea
          )

          if (intersection) {
            batchFeatures.push(intersection)
            resultFeatures.push(intersection)
          }

          processedCount++

          // Enviar lote parcial cuando se alcanza el tamaño del batch
          if (batchFeatures.length >= batchSize) {
            postMessage({
              type: 'partial',
              features: [...batchFeatures] // Clonar para evitar problemas
            } as PartialMessage)
            
            batchFeatures = [] // Limpiar batch
          }

          // Actualizar progreso más frecuentemente para datasets grandes
          const progressInterval = Math.max(1000, Math.floor(totalCombinations / 200)) // Mínimo cada 1000, máximo 200 updates
          if (processedCount % progressInterval === 0) {
            const progress = Math.min(95, 15 + (processedCount / totalCombinations) * 80)
            sendProgress(Math.floor(progress))
            console.log(`[Worker] Progress: ${Math.floor(progress)}% (${processedCount}/${totalCombinations})`)
          }

        } catch (error) {
          console.warn(`Error processing intersection ${i},${j}:`, error)
          processedCount++
        }
      }
    }

    // Fase 3: Finalización (95-100%)
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

  } catch (error) {
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
      console.log('[Worker] Starting partial intersection calculation...')
      processIntersection(message.payload)
      break

    case 'ABORT':
      isAborted = true
      console.log('[Worker] Intersection calculation aborted')
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