import axios from 'axios'
const api_host = import.meta.env.VITE_API_HOST
const Geoserver_host = import.meta.env.VITE_GEOSERVER_HOST
export async function getLayers() {
  try {
    let response = await axios.get(api_host + '/layers')
    return response.data || [];
  } catch (e) {
    console.error('Error: getLayers - ', e)
    return [];
  }
}
export async function getStylesLayers() {
  try {
    let response = await axios.get(api_host + '/layers/styles')
    return response.data || { list: [], list_active: [] };
  } catch (e) {
    console.error('Error: getStylesLayers - ', e)
    return { list: [], list_active: [] };
  }
}
export async function getLayerWFS(name_layer, bbox = null, datastore='postgis') {
  try {
    const params = {}
    if (bbox) {
      params.bbox = bbox
      params.datastore = datastore
    }
    let response = await axios.get(api_host + '/layers/wfs/' + name_layer, {
      params: params
    })
    return response.data
  } catch (e) {
    console.error('Error: getLayer WFS - ', e)
  }
}
export async function getLegend(name_layer) {
  try {
    let response = await axios.get(api_host + '/layers/legend/' + name_layer, {
      responseType: 'blob'
    })
    let url = await URL.createObjectURL(response.data)
    return url
  } catch (e) {
    console.error('Error: getLegend - ', e)
  }
}
export async function getAttributesLayer(params) {
  try {
    let response = await axios.post(api_host + '/layers/attributes', { params: params })
    return response.data
  } catch (e) {
    console.error('Error: getMetadata - ', e)
  }
}
export async function get_import_names_Layers(file, format = 'gpkg') {
  const formData = new FormData()
  formData.append('file', file)
  try {
    let response = await axios.post(api_host + `/import/${format}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (e) {
    console.error('Error: getImportLayer - ', e)
  }
}
export async function getLayer_imported(name_layer, file, format) {
  const formData = new FormData()
  formData.append('file', file)
  try {
    let response = await axios.post(api_host + `/import/${format}/${name_layer}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (e) {
    console.error('Error: getLayer_imported - ', e)
  }
}
export async function getActivitiesLandSea(){
    try {
        let response = await axios.get(api_host+'/process/getListActivities');
        return response.data;
    } catch (e) {
        console.error("Error: getActivitiesLandSea - ", e)
    }
}
export async function getTableLandSea(){
    try {
        let response = await axios.get(api_host+'/process/getTableLandSea');
        return response.data;
    } catch (e) {
        console.error("Error: getTableLandSea - ", e)
    }
}

export async function downlaodGeoserver(name_layer) {
  try {
    let response = await axios.get(
      Geoserver_host +
        `ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ReMAP:${name_layer}&outputFormat=application/json`,
      { responseType: 'blob' }
    )
    console.log(response)
    let url = await URL.createObjectURL(response.data)
    console.log(url)
    return url
  } catch (e) {
    console.error('Error: downloadGeoserver - ', e)
  }
}

export async function downloadGeopackage(name_layer, onDownloadProgress) {
  try {
    const response = await axios.get(api_host + `/export/gpkg/${name_layer}`, {
      responseType: 'blob',
      onDownloadProgress: onDownloadProgress
    })
    if(response.status !== 200 || response.data === undefined){
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }
    const url = window.URL.createObjectURL(new Blob([response.data]))
    return url
  } catch (e) {
    console.error('Error: downloadGeopackage - ', e)
  }
}

export async function downloadShapefile(name_layer, onDownloadProgress) {
  try {
    const response = await axios.get(api_host + `/layers/download-shapefile/${name_layer}`, {
      responseType: 'blob',
      onDownloadProgress: onDownloadProgress
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    return url
  } catch (e) {
    console.error('Error: downloadShapefile - ', e)
    return null;
  }
}


export async function getListDatastores () {
  try {
    const response = await axios.get(`${api_host}/layers/datastores/list`)
    return response.data
  } catch (error) {
    console.error('Error fetching datastore:', error)
    return 'unknown'
  }
}

export async function getLayersDatastore(name_datastore) {
  try {
    const response = await axios.get(`${api_host}/layers/datastore/list_layers/${name_datastore}`)
    return response.data
  } catch (error) {
    console.error('Error fetching datastore:', error)
    return 'unknown'
  }
}

export async function getListNameEcosystemHabitats(){
  try {
    let responseEcosystem = await axios.get(api_host + `/process/ecosystem/listEcosystemServices`);
    let responseHabitats = await axios.get(api_host + '/process/ecosystem/listHabitats');
    return {
      ecosystem: responseEcosystem.data,
      habitats: responseHabitats.data
    };
  } catch (e) {
    console.error("Error: getTableEcosystemService - ", e)
  }
}
export async function getMappingPartialConservation(features){
  try {
    let response = await axios.post(api_host + '/process/partialIntersection', 
      {features_properties: features});
    return response.data;
  } catch (e) {
    console.error("Error: getMappingPartialConservation - ", e)
  }
}