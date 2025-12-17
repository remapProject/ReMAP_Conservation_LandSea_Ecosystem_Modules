import { useImportLayersStore } from '../store/ImportLayersStore'
import axios from 'axios'

const api_host = import.meta.env.VITE_API_HOST

export const requestFullOfflineIntersection = async (selectedLayers, email, module) => {
  try {
    const importLayersStore = useImportLayersStore()
    const formData = new FormData()
    formData.append('email', email)
    formData.append('moduleName', module)

    selectedLayers.forEach((layer, index) => {
      if (importLayersStore.isImported(layer)) {
        const file = importLayersStore.getFile(layer)
        if (file) {
          formData.append(`layer${index + 1}`, file)
        }
      } else {
        formData.append(`layer${index + 1}`, layer)
      }
    })

    const response = await axios.post(`${api_host}/intersection/offline`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    return response.data
  } catch (error) {
    console.error('Error requesting intersection:', error)
    let errorMessage =
      'Failed to submit request. It is possible that your layers do not meet the conditions for full intersection, please read the help section and try again.'
    if (error.response?.status === 400 && error.response?.data?.output) {
      errorMessage = `The intersection already exists. Result layer name: ${error.response.data.output}`
    }
    throw new Error(errorMessage)
  }
}

export const requestAdminIntersection = async (selectedLayers, module, options) => {
  try {
    const formData = new FormData()
    formData.append('admin', 'true')
    formData.append('moduleName', module)
    formData.append('layer1', selectedLayers[0])
    formData.append('layer2', selectedLayers[1])
    if(options.styleOption != '') formData.append('styleOption', options.styleOption)
    if(options.nameOutputOption != '') formData.append('nameOutputOption', options.nameOutputOption)
    const response = await axios.post(`${api_host}/intersection/offline`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  } catch (error) {
    console.error('Error requesting intersection:', error)
    throw error
  }
}
