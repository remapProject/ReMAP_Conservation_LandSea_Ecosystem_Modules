<script setup>
import { ref } from 'vue'
import HeaderPopUp from '@/components/Visor/PopUpNavbar/HeaderPopUp.vue'
import { startDrag, stopDrag } from '@/components/Visor/PopUpNavbar/MouseDragPopUp.js'
import InfoFeedback from '@/components/utils/InfoFeedback.vue'
import AlertGeneral from '@/components/utils/AlertGeneral.vue'
import { usePopUpNavbarStore } from '@/store/PopUpNavbarStore.js'
import { get_import_names_Layers } from '@/services/service';
import { useImportLayersStore } from '@/store/ImportLayersStore';
import { useLayersStore } from '@/store/LayersStore';

const getExt = (f) => (f?.name?.split('.').pop() || '').toLowerCase()

const popup_store=usePopUpNavbarStore();
const import_layers_store=useImportLayersStore();
const layers_store =useLayersStore();
const maxFileSize = 150;
const info = `Upload additional layers that can be used as Input data.
Use this option to add your own layers when they are not available from the “Layers” menu. 
Your layers will appear in the “Layers” window under the subsection “Imported layers”.
`;
const text = `
  To import layers in the module it is necessary to follow these data models: <br/><br/>
  <strong>For MSP layers</strong>: it <strong>is necessary to follow EMODnet MSP data model.</strong>, 
    for an example please download the MSP_EMODnet layer 
    following the code list (attributes/properties) for “seausefuct” and “hilucsmsp”.  <br/><br/>
  <strong>For MPA layers</strong>: it <strong>is necessary to follow the Protected sites INSPIRE data model.</strong>, 
    for an example please download the MPA_Protected_Sites” layer, following the INSPIRE codelist 
    (attributes/properties) for IUCN “designation”.  <br/><br/>
  <strong>For Costal layers</strong>: it <strong>is necessary to follow EMODnet MSP data model.</strong>, 
    for an example please download the MSP_EMODnet layer 
    following the code list (attributes/properties) for “seausefuct” and “hilucsmsp”.  <br/><br/>
  Imported layers must be:  <br/><br/>
  GeoJSON or GeoPackage files. <br/><br/>
  Only multipolygon geometries.  <br/><br/> 
  <strong>Reprojection notice: layers must match the system CRS EPSG: 4326.</strong> <br/><br/>
  You can download an example. You can use this file as a template to prepare your datasets. 
  <strong>For more details, you can check the “Help” section.</strong>` ;
const props = defineProps({
  id:{ required:true, type: String}
})
const selectedFile = ref(null);
const fileInput = ref(null);
const isDisabled = ref(false);
const type_input = ref('');
const showAlert = ref(false)
const alertMessage = ref('')
const alertType = ref('success')
const showTemporaryAlert = (message, type = 'success') => {
  alertMessage.value = message
  alertType.value = type
  showAlert.value = true
}

const isValidFile = (file) => {
  const validExtensions = new Set(['geojson', 'gpkg']);
  const isSizeValid = maxFileSize ? file.size <= (maxFileSize * 1024 * 1024) : true;
  
  return validExtensions.has(getExt(file)) && isSizeValid && type_input.value !== '';
};
const onFileSelected = (event) => {
  const file = event.target.files?.[0] || null;
  selectedFile.value = file;
  if (file && !isValidFile(file)) {
    console.warn('Archivo no válido o falta seleccionar tipo de input');
  }
};

const handleFileChange = async () => {
  if (!selectedFile.value) return;
  const file = selectedFile.value;
  isDisabled.value = true;
  try {
    if (getExt(file) === 'geojson') {
      import_layers_store.add_file(file.name.split('.')[0], file);
      import_layers_store.add_layer(file.name.split('.')[0]);
      import_layers_store.add_type_file(file.name.split('.')[0], type_input.value);
    } else {
      const response = await get_import_names_Layers(file);
      if (!response) throw new Error("Error import Layers");
      import_layers_store.add_file(response.featuresTables, file);
      import_layers_store.add_layers(response.featuresTables);
      import_layers_store.add_type_file(response.featuresTables, type_input.value);
    }
    if (!layers_store.list_server.includes('imported local')) layers_store.add_server();
    showTemporaryAlert(`Impoting layer completed!`, 'success')
  } catch (error) {
    console.error('Error importing file:', error);
  } finally {
    isDisabled.value = false;
    selectedFile.value = null;
    if (fileInput.value) fileInput.value.value = '';
  }
}
const removeFile = () => {
  selectedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const triggerFileInput = () => {
  if (fileInput.value && !isDisabled.value) {
    fileInput.value.click();
  }
};

</script>

<template>
  <div v-if="popup_store.list_active[props.id]" id="import" class="pop_up_layers popUp_visor" @mousedown="startDrag" @mouseup="stopDrag">
    <v-card>
      <template v-slot:title>
        <HeaderPopUp title="Import Layers" :id="props.id"></HeaderPopUp>
      </template>
      <v-card-text>
        <InfoFeedback :info="info"></InfoFeedback>
        <div>
          <v-radio-group v-model="type_input">
            <v-radio label="Results of Geoprocessing Offline" value="result"></v-radio>
            <v-radio label="Input Layer for Geoprocessing" value="input"></v-radio>
          </v-radio-group>
          <div class="uploader-container" :class="{ 'is-disabled': isDisabled }">
            <div :class="['uploader', selectedFile && !isValidFile(selectedFile) ? 'invalid' : 'valid']"
                  @click="triggerFileInput">
              <template v-if="selectedFile">
                <v-icon icon="mdi-file" size="x-large" color="#D76B42" class="mb-3"></v-icon>
                <p class="file-info">{{ selectedFile.name }}</p>
                <button type="button" @click.stop="removeFile" class="remove-button" :disabled="isDisabled">
                  <v-icon icon="mdi-close" size="small"></v-icon>
                </button>
                <p v-if="!isValidFile(selectedFile)" class="error-message">
                  Invalid file. Please select a geojson or geopackage and the type of layer.
                </p>
              </template>
              <template v-else>
                <v-icon icon="mdi-cloud-upload" size="x-large" color="#D76B42" class="mb-3"></v-icon>
                <p class="upload-instruction">
                  <span class="font-semibold">Click to upload</span>
                </p>
                <p class="file-size-info">GeoJson (.geojson) or Geopackage (.gpkg) (max. {{ maxFileSize }}MB)</p>
              </template>
            </div>
            <input ref="fileInput" type="file" class="hidden" accept=".geojson,.gpkg" @change="onFileSelected" :disabled="isDisabled"/>
          </div>
        </div>
        <v-btn class="mt-4" color="primary" @click="handleFileChange($event)" :disabled="!selectedFile || isDisabled">
          Import Layer
        </v-btn>
      </v-card-text>
    </v-card>
    <v-alert v-if="showAlert" class="custom-alert alert_imported" :type="alertType" closable>
      {{ alertMessage }}
    </v-alert>
    <AlertGeneral class="alert_import" :show="true" title="Warning for Importing Layers" :text="text"></AlertGeneral>
  </div>
</template>

<style scoped>
#import{
  width: 30%;
}
.uploader-container {
  width: 100%;
}

.uploader {
  position: relative;
  height: 10rem;
  width: 100%;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed;
  border-radius: 0.5rem;
}

.uploader.valid {
  border-color: #d1d5db;
}

.uploader.invalid {
  border-color: #f87171;
}

.file-info {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.remove-button {
  position: absolute;
  right: 0.5rem;
  top: 0.5rem;
  color: #6b7280;
}

.remove-button:hover {
  color: #374151;
}

.font-semibold {
  font-weight: 600;
}

.error-message {
  font-size: 0.875rem;
  color: #f87171;
}

.upload-instruction {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.file-size-info {
  font-size: 0.75rem;
  color: #6b7280;
}

.hidden {
  visibility: hidden;
  position: absolute;
}

.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.is-disabled .uploader {
  cursor: not-allowed;
}
.alert_imported {
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 15%;
  z-index: 1000;
}
</style>


// Fallback: minimal file handler to support FeatureCollection results
const handleFileChange = async (event) => {
  try {
    const file = event?.target?.files?.[0]
    if (!file) return
    const ext = getExt(file)
    if (ext === 'geojson') {
      const txt = await file.text()
      const data = JSON.parse(txt)
      if (data && data.type === 'FeatureCollection') {
        const name = file.name.replace(/\.[^/.]+$/, '')
        if (typeof layers_store?.setIntersectionLayers === 'function') {
          layers_store.setIntersectionLayers({ result: data })
          try {
            const arr = layers_store.intersections?.value ?? layers_store.intersections
            const last = Array.isArray(arr) ? arr[arr.length - 1] : null
            if (last && typeof last === 'object') last.name = name
          } catch {}
        } else {
          const entry = { id: Date.now(), name, group:'results', visible:true, isPartial:false, isLandSea:false, needsPropertyMapping:true, data:{ result:data } }
          const ints = layers_store.intersections?.value ?? layers_store.intersections
          if (Array.isArray(ints)) ints.push(entry)
          const act = layers_store.list_active?.value ?? layers_store.list_active
          if (Array.isArray(act) && !act.includes(name)) act.push(name)
        }
        return
      }
    }
  } catch (err) {
    console.error('[Import] Error reading file', err)
  }
}
