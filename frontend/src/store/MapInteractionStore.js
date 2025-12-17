import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMapInteractionStore = defineStore('mapInteraction', () => {
  const drawnArea = ref(null)
  
  const setDrawnArea = (geoJSON) => {
    drawnArea.value = geoJSON
  }
  
  const clearDrawnArea = () => {
    drawnArea.value = null
  }

  return { drawnArea, setDrawnArea, clearDrawnArea }
})