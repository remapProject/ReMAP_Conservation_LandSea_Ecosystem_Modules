<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { checkAuth, remapping } from '@/services/admin.service'
import { requestAdminIntersection } from '@/services/intersection.service'
import { getLayersDatastore } from '@/services/service'

const router = useRouter()
const layers = ref([])
const selectedLayer1 = ref(null)
const selectedLayer2 = ref(null)
const loading = ref(true)
const error = ref(null)
const showAlert = ref(false)
const alertMessage = ref('')
const alertType = ref('success')
const isLoading = ref(false)
const module = ref('')
const styleOption = ref('no');
const nameOutputOption = ref('default');
const name_output_file = ref('');
const style_name = ref('');
const name_layer_remapping = ref('');

const showTemporaryAlert = (message, type = 'success') => {
  alertMessage.value = message
  alertType.value = type
  showAlert.value = true

  setTimeout(() => {
    showAlert.value = false
  }, 3000)
}

onMounted(async () => {
  if (!(await checkAuth())) router.replace('/admin/login')
  try {
    let list_name_datastore = ['postgis', 'base de datos', 'postgis_remap_test']
    list_name_datastore.forEach(async (name_ds) => {
      let layers_ds = await getLayersDatastore(name_ds)
      if(layers_ds && layers_ds.length > 0 && layers_ds !== 'unknown') layers.value = layers.value.concat(layers_ds)
    })
  } catch (e) {
    error.value = 'Error fetching layers'
  } finally {
    loading.value = false
  }
})

const availableLayers1 = computed(() => layers.value.filter((l) =>
   l !== selectedLayer2.value
));

const availableLayers2 = computed(() => layers.value.filter((l) => 
  l !== selectedLayer1.value
));

const isExecuteEnabled = computed(() => selectedLayer1.value && selectedLayer2.value)

const execute = async (module) => {
  if(module == 'es') downloadGeoprocessingEcosystemServices()
  else{
  isLoading.value = true
    try {
      await requestAdminIntersection([selectedLayer1.value, selectedLayer2.value], module,{
        styleOption: (styleOption.value !== 'no') ? styleOption.value : '',
        nameOutputOption: (nameOutputOption.value !== 'default') ? name_output_file.value : ''      })
      showTemporaryAlert(`Request sent for module: ${module}`, 'success')
    } catch (error) {
      showTemporaryAlert(error.message || 'Failed to submit request. Please try again.', 'error')
    } finally {
      isLoading.value = false
    }
  }
}

const downloadGeoprocessingEcosystemServices = async () => {
  console.log('Downloading Geoprocessing Ecosystem Services module...')
  let link_zip = 'https://github.com/remapProject/Download_Geoprocessing_Ecosystem_Services/archive/refs/heads/main.zip'
  try{
    const a = document.createElement('a')
    a.href = link_zip
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.download = 'Download_Geoprocessing_Ecosystem_Services.zip'
    document.body.appendChild(a)
    a.click()
    a.remove()
    showTemporaryAlert('Descarga iniciada', 'success');
  } catch (err) {
    showTemporaryAlert(err.message || 'Error descargando desde GitHub', 'error');
  } finally {
    isLoading.value = false;
  }
}
const submit = async (e) => {
  loading.value = true
  await remapping(name_layer_remapping.value,'conservation').then((response)=>{
    loading.value = false
    if(response==200){
      showTemporaryAlert('Remapping layer executed successfully', 'success')
    } else {
      showTemporaryAlert('Error executing remapping layer', 'error')
    }
  })
}



watch(module, ()=>{
  selectedLayer1.value = null
  selectedLayer2.value = null
  name_output_file.value = ''
  nameOutputOption.value = 'default'
  styleOption.value = 'no'
  style_name.value = ''
})
</script>

<template>
  <div class="full-screen-bg">
    <v-container class="fill-height d-flex align-center justify-center">
      <div class="pa-6 rounded-xl card_content_admin">
        <v-alert v-if="showAlert" class="custom-alert" :type="alertType" closable>
          {{ alertMessage }}
        </v-alert>
        <v-card-title class="text-h4 font-weight-bold text-center mb-6 text-primary">
          <v-icon icon="mdi-layers" size="40" class="mr-2"></v-icon>
          Layer Operations
        </v-card-title>

        <v-card-text v-if="loading" class="text-center">
          <v-progress-circular indeterminate size="64" color="primary"></v-progress-circular>
          <div class="text-body-1 mt-4">Loading available layers...</div>
        </v-card-text>

        <v-card-text v-else-if="error">
          <v-alert type="error" variant="tonal" class="rounded-lg">
            <template v-slot:title>
              <strong>Error loading layers:</strong>
            </template>
            {{ error }}
          </v-alert>
        </v-card-text>

        <v-card-text>
          <v-card>
            <v-tabs v-model="module" color="primary">
              <v-tab :value="'msp'">Conservation</v-tab>
              <v-tab :value="'lsi'">Land Sea Interactions</v-tab>
              <v-tab :value="'es'">Ecosystem services</v-tab>
              <v-tab :value="'others'">Others features</v-tab>
            </v-tabs>

            <v-divider></v-divider>
          </v-card>
          <v-row 
            v-if="module === 'msp' || module === 'lsi'"
            class=" justify-center"
          >
            <v-card-text class="text-body-1 mb-4">
              Select two different layers to perform operations. You can execute either the
              <strong>{{(module ==='msp')?  'Conservation (MSP)': 'LandSea (LSI)'}}</strong>  module based on your
              selection.
            </v-card-text>
            <v-col cols="12" md="6" class="pr-md-4 d-flex flex-column">
              <v-card
                variant="flat"
                class="pa-4 rounded-lg layer-card flex-grow-1 d-flex flex-column"
              >
                <div class="d-flex justify-space-between align-center">
                  <v-card-title class="text-h6 font-weight-medium mb-2 text-secondary">
                    Layer 1 - MSP (Maritime Spatial Planning)
                  </v-card-title>
                  <v-btn
                    v-if="selectedLayer1"
                    icon
                    variant="text"
                    size="small"
                    @click="selectedLayer1 = null"
                  >
                    <v-icon>mdi-close</v-icon>
                  </v-btn>
                </div>
                <v-select
                  v-model="selectedLayer1"
                  :items="availableLayers1"
                  label="Select first layer"
                  variant="outlined"
                  color="primary"
                  item-title="name"
                  item-value="name"
                  hide-details
                  class="layer-select flex-grow-1"
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item
                      v-bind="props"
                      :class="{ 'disabled-layer': item.raw.name === selectedLayer2 }"
                    ></v-list-item>
                  </template>
                </v-select>
              </v-card>
            </v-col>

            <v-col cols="12" md="6" class="pl-md-4 d-flex flex-column">
              <v-card
                variant="flat"
                class="pa-4 rounded-lg layer-card flex-grow-1 d-flex flex-column"
              >
                <div class="d-flex justify-space-between align-center">
                  <v-card-title class="text-h6 font-weight-medium mb-2 text-secondary">
                    Layer 2 - {{(module ==='msp')?  'MPA (Maritime Planning Area)': 'Costal Land Use'}}
                  </v-card-title>
                  <v-btn
                    v-if="selectedLayer2"
                    icon
                    variant="text"
                    size="small"
                    @click="selectedLayer2 = null"
                  >
                    <v-icon>mdi-close</v-icon>
                  </v-btn>
                </div>
                <v-select
                  v-model="selectedLayer2"
                  :items="availableLayers2"
                  label="Select second layer"
                  variant="outlined"
                  color="primary"
                  item-title="name"
                  item-value="name"
                  hide-details
                  class="layer-select flex-grow-1"
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item
                      v-bind="props"
                      :class="{ 'disabled-layer': item.raw.name === selectedLayer1 }"
                    ></v-list-item>
                  </template>
                </v-select>
              </v-card>
            </v-col>
            
            <v-col cols="12" md="6" class="pl-md-4 d-flex flex-column">
              <h4> Do you create new Style? There is a styles created before.</h4>
              <v-radio-group v-model="styleOption" inline>
                <v-radio label="Don't create style" value="no"></v-radio>
                <v-radio label="Create new style" value="new_style"></v-radio>
              </v-radio-group>
              <v-text-field v-if="styleOption !== 'no'" 
                v-model="style_name"
                label="Write name of new style"
                >
              </v-text-field>
              <h4> Do you edit name of output Geoprocessing?</h4>
              <v-radio-group v-model="nameOutputOption" inline>
                <v-radio label="Default (Concatenate the layer names with the date)" value="default"></v-radio>
                <v-radio label="Create a name of output" value="name_output"></v-radio>
              </v-radio-group>
              <h5>
                <strong>Do not use special characters. Only numbers, letters, and underscores (_)</strong> 
                are allowed.
              </h5>
              <v-text-field v-model="name_output_file"
                label="Name of output Layer Geoprocessing"
                placeholder="name1_name2_YYYYMMDD"
              ></v-text-field>
            </v-col>
            <v-col cols="12" class="pr-md-4 d-flex flex-column">
              <v-btn
                color="primary"
                size="x-large"
                :disabled="!isExecuteEnabled || isLoading"
                @click="execute(module)"
                class="execute-btn"
                rounded="xl"
                elevation="4"
              >
                <v-icon v-if="module == 'msp'" icon="mdi-leaf" size="24" class="mr-2"></v-icon>
                <v-icon v-else icon="mdi-radar" size="24" class="mr-2"></v-icon>
                <v-progress-circular v-if=isLoading[module]
                  indeterminate
                  size="24"
                  color="white"
                ></v-progress-circular>
                Execute {{ module === 'msp' ? 'Conservation' : 'LandSea Interactions' }}
              </v-btn>
            </v-col>
          </v-row>
          <v-row 
            v-else-if="module==='es'"
            class=" justify-center" 
            style="margin: 10% 0% auto !important;"
          >
            <v-col cols="12" class="pr-md-8 d-flex flex-column justify-center align-center align-content-center">
              <v-btn
                v-if="module==='es'"
                color="#4CAF50"
                size="x-large"
                :disabled="isLoading"
                @click="execute(module)"
                class="execute-btn"
                rounded="xl"
                elevation="4"
              >
                <v-icon v-if="!isLoading.ec" icon="mdi-leaf" size="24" class="mr-2"></v-icon>
                <v-progress-circular
                  v-else
                  indeterminate
                  size="24"
                  color="white"
                ></v-progress-circular>
                Download Module Geoprocessing
              </v-btn>
              <h5>If you can't download, it clicks in the link (here) and the button 'Code' select 'Download zip'. <a href="https://github.com/remapProject/Download_Geoprocessing_Ecosystem_Services">here</a></h5>
            </v-col>
          </v-row>
          <v-row 
            v-else
            class="justify-center content_others_features" 
          >
          <h2> This features is <strong>only allowed for the Conservation module.</strong></h2>
          <h4>It consists of recalculating the polygon types according to 
            the conditions of each feature based on attributes designation, hilucsmsp 
            and seausefunction. In this way, the data will be updated directly in GeoServer.</h4>              
            <v-text-field
              v-model="name_layer_remapping"
              label="Name of layer for remapping"
            ></v-text-field>
            <v-btn
              :loading="loading"
              class="mt-2"
              text="Submit"
              color="primary"
              type="submit"
              block
              @click="submit()"
            ></v-btn>
          </v-row>
        </v-card-text>
      </div>
    </v-container>
  </div>
</template>

<style scoped>
.full-screen-bg {
  background-color: #f5f5f5;
  min-height: 100vh;
  width: 100%;
}
.card_content_admin {
  width: 90%;
  max-width: 1000px;
  min-height: 600px;
  background-color: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}
.bg-grey-lighten-4 {
  background-color: #f5f5f5;
}
.layer-card {
  border: 2px solid #e0e0e0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
}

.layer-card:hover {
  border-color: var(--v-primary-base);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.layer-select {
  background-color: #ffffff;
  border-radius: 8px;
}

.disabled-layer {
  opacity: 0.5;
  background-color: #f8f9fa;
  pointer-events: none;
}

.execute-btn {
  min-width: 280px;
  padding: 20px 32px;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  transform-origin: center;
}

.execute-btn:not(:disabled) {
  box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.2);
}

.execute-btn:not(:disabled):hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(var(--v-theme-primary), 0.3);
}

.text-primary {
  color: var(--v-primary-base);
}

.text-secondary {
  color: var(--v-secondary-base);
}

.custom-alert {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 400px;
  text-align: center;
}
.content_others_features{
  margin: 5% 0% auto !important;
  display: flex;
  flex-direction: column;
}
</style>
