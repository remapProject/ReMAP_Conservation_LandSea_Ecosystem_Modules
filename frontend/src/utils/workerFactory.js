// Web Worker utility for Vite compatibility
// Este archivo ayuda con la carga de workers en diferentes entornos

export function createPartialIntersectionWorker() {
  // Intentar diferentes métodos de carga según el entorno
  
  // Método 1: URL con import.meta.url (preferido para Vite)
  try {
    return new Worker(
      new URL('../workers/partialIntersection.worker.ts', import.meta.url),
      { type: 'module' }
    )
  } catch (error) {
    console.warn('Failed to load worker with URL method:', error)
  }

  // Método 2: Importación directa (fallback)
  try {
    // Esta será reemplazada por Vite en build time
    const workerUrl = '/src/workers/partialIntersection.worker.ts'
    return new Worker(workerUrl, { type: 'module' })
  } catch (error) {
    console.warn('Failed to load worker with direct path:', error)
  }

  // Método 3: Worker inline como último recurso
  const workerCode = `
    import * as turf from 'https://unpkg.com/@turf/turf@6/turf.min.js'
    
    self.onmessage = function(event) {
      const message = event.data;
      if (message.cmd === 'RUN') {
        // Implementación básica para emergencia
        self.postMessage({ type: 'error', error: 'Worker fallback not implemented' });
      }
    }
  `
  
  const blob = new Blob([workerCode], { type: 'application/javascript' })
  return new Worker(URL.createObjectURL(blob), { type: 'module' })
}

export function createLandSeaIntersectionWorker() {
  // Intentar diferentes métodos de carga según el entorno
  
  // Método 1: URL con import.meta.url (preferido para Vite)
  try {
    return new Worker(
      new URL('../workers/landSeaIntersection.worker.ts', import.meta.url),
      { type: 'module' }
    )
  } catch (error) {
    console.warn('Failed to load Land-Sea worker with URL method:', error)
  }

  // Método 2: Importación directa (fallback)
  try {
    // Esta será reemplazada por Vite en build time
    const workerUrl = '/src/workers/landSeaIntersection.worker.ts'
    return new Worker(workerUrl, { type: 'module' })
  } catch (error) {
    console.warn('Failed to load Land-Sea worker with direct path:', error)
  }

  // Método 3: Worker inline como último recurso
  const workerCode = `
    self.onmessage = function(event) {
      const message = event.data;
      if (message.cmd === 'RUN') {
        // Implementación básica para emergencia
        self.postMessage({ type: 'error', error: 'Land-Sea Worker fallback not implemented' });
      }
    }
  `
  
  const blob = new Blob([workerCode], { type: 'application/javascript' })
  return new Worker(URL.createObjectURL(blob), { type: 'module' })
}