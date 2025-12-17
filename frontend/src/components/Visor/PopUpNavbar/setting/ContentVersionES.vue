<script setup>
import { onBeforeMount, ref, computed, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getListNameEcosystemHabitats } from '@/services/service'
import { useLayersStore } from '@/store/LayersStore';

const layers_store = useLayersStore();
const layerActive = ref();

const route = useRoute()
const list_habitats = ref([]);
const list_ecosystem = ref([]);
const list_descriptorsEcosystem = ref([]);
const selectTypeEcosystem = ref([]);
const selectTypeHabitat = ref([]);
const selectEcosystem = ref([]);
const selectHabitat = ref([]);
const listTypesEcosystem = computed(() => {
  if (!list_ecosystem.value) return [];
  return Object.keys(list_ecosystem.value)
})
const likesAllEcosystem = computed(() => {
  selectTypeEcosystem.value.length === Object.keys(list_ecosystem.value).length
})
const likesSomeEcosystem = computed(() => selectTypeEcosystem.value.length > 0)

const listTypesHabitat = computed(() => {
  if (!list_habitats.value) return [];
  return Object.keys(list_habitats.value).filter(item => !item.match(/\./))
})
const likesAllHabitat = computed(() => {
  selectTypeEcosystem.value.length === Object.keys(listTypesHabitat.value).length
})
const likesSomeHabitat = computed(() => selectTypeHabitat.value.length > 0)

onBeforeMount(async ()=>{
  if(route.name=='es') await getListEcosystemAndHabitats();
})
const toggle = (type) => {
  if(type === 'ecosystem') {
    if (likesAllEcosystem.value) {
      selectTypeEcosystem.value = []
    } else {
      selectTypeEcosystem.value = Object.keys(list_ecosystem.value)
    }
  } else if(type === 'habitat') {
    if (likesAllHabitat.value) {
      selectTypeHabitat.value = [];
    } else {
      selectTypeHabitat.value = listTypesHabitat.value;
    }
  }
}
const getListEcosystemAndHabitats = async () => {
  try {
    const response = await getListNameEcosystemHabitats();
    if (response && Object.keys(response).length > 0) {
      list_habitats.value = response.habitats || [];
      list_ecosystem.value = response.ecosystem.ecosystemServices || [];
      list_descriptorsEcosystem.value = response.ecosystem.ecosystemServicesNames || [];
    } else {
      showTemporaryAlert('No ecosystems or habitats found.', 'warning')
    }
  } catch (error) {
    console.error('Error fetching ecosystems and habitats:', error)
    showTemporaryAlert('Failed to load ecosystems and habitats.', 'error')
  }
}
const getListEcosystemServices = (nameGroupEcosystemServices) => {
  if (!list_ecosystem.value || !nameGroupEcosystemServices) return [];
  return (list_ecosystem.value[nameGroupEcosystemServices]) ?
    list_ecosystem.value[nameGroupEcosystemServices]: []; 
}
const getListHabitat = (nameTypeHabitat) => {
  if (!list_habitats.value || !nameTypeHabitat) return [];
  return  Object.keys(list_habitats.value).filter(item => item.startsWith(nameTypeHabitat));
}
watch(layerActive,(newValue, oldValue) => {
  if(layers_store.list_active.includes(oldValue)){
    
    layers_store.list_active = layers_store.list_active.filter(item => item !== oldValue);
  }
  if(newValue && !layers_store.list_active.includes(newValue) && (selectEcosystem.value.length>0 || selectHabitat.value.length>0)){ 
    layers_store.list_active.push(newValue);
  }
  
})
watch(selectEcosystem, (newValue) => {
  console.log("filtrado con", newValue, layerActive.value);
  layers_store.filtered_attributes_layer.ecosystem= selectEcosystem.value;
  if(!layers_store.list_active.includes(layerActive.value))  layers_store.list_active.push(layerActive.value);
})
watch(selectHabitat, (newValue) => {
  console.log("filtrado con", newValue, layerActive.value);
  layers_store.filtered_attributes_layer.habitat= selectHabitat.value;
  if(!layers_store.list_active.includes(layerActive.value))  layers_store.list_active.push(layerActive.value);

})
onUnmounted(() => {
  layers_store.filtered_attributes_layer = {ecosystem: [], habitat: []};
  layers_store.list_active = layers_store.list_active.filter(item => item !== layerActive.value);
})
</script>

<template>
  <h4>Select the layer for filter:</h4>
  <v-select v-model="layerActive" :items="layers_store.list_layers" label="Layer applied" density="compact">
  </v-select>
  <v-expansion-panels id="contentFilter">
    <v-expansion-panel>
      <v-expansion-panel-title class="expansion_title">
        <template v-slot:default="{ expanded }">
          <v-row no-gutters>
            <v-row class="d-flex justify-start"> Select Ecosystem Services: </v-row>
            <v-row class="text-grey">
              <v-fade-transition leave-absolute>
                <p v-if="!expanded && selectTypeEcosystem.length !== 0" key="0"> 
                  {{ selectEcosystem.join(', ') }} 
                </p>
              </v-fade-transition>
            </v-row>
          </v-row>
        </template>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-row no-gutters>
        <h4>Find the ecosystem services and selected it.</h4></v-row>
        <v-row no-gutters>
          <v-select v-model="selectTypeEcosystem" :items="listTypesEcosystem" label="Groups of Ecosystem Services" density="compact" clearable chips multiple>
            <template v-slot:prepend-item  v-if="listTypesEcosystem.length !== 0">
              <v-list-item title="Select All" @click="toggle('ecosystem')">
                <template v-slot:prepend>
                  <v-checkbox-btn
                    :color="likesSomeEcosystem ? 'indigo-darken-4' : undefined"
                    :indeterminate="likesSomeEcosystem && !likesAllEcosystem"
                    :model-value="likesAllEcosystem"
                  >
                  </v-checkbox-btn>
                </template>
              </v-list-item>
              <v-divider class="mt-2"></v-divider>
            </template>
          </v-select>
          <v-divider/>
        </v-row>
        <div class="content_list">
          <template v-for="(groupEcosystem, i) in selectTypeEcosystem" :key="i">
            <template v-if="selectTypeEcosystem.length>1">
            <h3 class="group-header">{{ groupEcosystem }}</h3>
            <v-divider/>
            </template> 
            <v-list-item v-for="ecosystem in getListEcosystemServices(groupEcosystem)" :key="ecosystem" class="mb-2">
              <v-checkbox
                v-model="selectEcosystem"
                class="check"
                :value="ecosystem"
                :color="'var(--color-text-blue)'"
              >
                <template v-slot:label>
                  <div class="d-flex align-center">
                    <h3 class="label_layer">{{ ecosystem }}: <span class="descriptor_habitat">{{ list_descriptorsEcosystem[ecosystem]}} </span></h3>
                  </div>
                </template>
              </v-checkbox>
            </v-list-item>
          </template>

        </div>
        </v-expansion-panel-text> 
    </v-expansion-panel>

    <v-expansion-panel>
      <v-expansion-panel-title class="expansion_title">
        <template v-slot:default="{ expanded }">
          <v-row no-gutters>
            <v-row class="d-flex justify-start"> Select Habitats: </v-row>
            <v-row class="text-grey">
              <v-fade-transition leave-absolute>
                <p v-if="!expanded && selectTypeHabitat.length !== 0" key="0"> 
                  {{ selectHabitat.join(', ') }} 
                </p>
              </v-fade-transition>
            </v-row>
          </v-row>
        </template>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-row no-gutters>
        <h4>Find the Habitat and selected it.</h4></v-row>
        <v-row no-gutters>
          <v-select v-model="selectTypeHabitat" :items="listTypesHabitat" label="Type of Habitat" density="compact" clearable chips multiple>
            <template v-slot:prepend-item v-if="listTypesHabitat.length !== 0">
              <v-list-item title="Select All" @click="toggle('habitat')">
                <template v-slot:prepend>
                  <v-checkbox-btn
                    :color="likesSomeHabitat ? 'indigo-darken-4' : undefined"
                    :indeterminate="likesSomeHabitat && !likesAllHabitat"
                    :model-value="likesAllHabitat"
                  >
                  </v-checkbox-btn>
                </template>
              </v-list-item>
              <v-divider class="mt-2"></v-divider>
            </template>
          </v-select>
          <v-divider/>
        </v-row>
        <div class="content_list">
          <template v-for="(typeHabitat, i) in selectTypeHabitat" :key="i">
            <template v-if="selectTypeHabitat.length>1">
              <h3 class="group-header">{{ typeHabitat }}</h3>
              <v-divider/>
            </template>
            <v-list-item v-for="(habitat, i) in getListHabitat(typeHabitat)" :key="i" class="mb-2">
              <v-checkbox
                v-model="selectHabitat"
                class="check"
                :value="(habitat)"
                :color="'var(--color-text-blue)'"
              >
                <template v-slot:label>
                  <div class="d-flex align-center">
                    <h3 class="label_layer code_habitat">
                      {{ habitat }}: <span class="descriptor_habitat">{{ list_habitats[habitat]}} </span></h3>
                  </div>
                </template>
              </v-checkbox>
            </v-list-item>
          </template>
        </div>
      </v-expansion-panel-text> 

     
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style>
.expansion_title {
  width: 100% !important; 
  width: -webkit-fill-available !important;
  width: -moz-available !important;
  width: fill-available !important;
}
#contentFilter {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
}
.content_list {
  overflow-y: auto;
  overflow-x: hidden;
  height: 300px;
}
.code_habitat {
  font-weight: bold;
  font-size: 1em;
  color: var(--color-text-blue);
}
.descriptor_habitat {
  font-weight: 400;
  font-size: 0.8em;
  color: var(--color-text-grey);
}
</style>