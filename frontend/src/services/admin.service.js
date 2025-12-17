import axios from 'axios'

const api_host = import.meta.env.VITE_API_HOST

export const adminLogin = async (credentials) => {
  try {
    const response = await axios.post(`${api_host}/auth/admin/login`, credentials)
    return response.data
  } catch (error) {
    throw new Error('Authentication error')
  }
}

export const checkAuth = async () => {
  const token = localStorage.getItem('adminToken')
  if (!token) {
    return false
  }
  try {
    await axios.get(`${api_host}/auth/admin/check`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return true
  } catch (error) {
    return false
  }
}
export const remapping = async (name_layer, module)=>{
  try {
    let response = await axios.post(`${api_host}/process/mappingResult?module=${module}&name_layer=${name_layer}`)
    return response.status;
  } catch(error){
    console.error('Error: remapping - ', error)
  }
}