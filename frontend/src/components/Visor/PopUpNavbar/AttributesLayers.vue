<script setup>
  import { onBeforeMount } from 'vue';
  import { useRoute } from 'vue-router';
  import HeaderPopUp from '@/components/Visor/PopUpNavbar/HeaderPopUp.vue'
  import { startDrag, stopDrag } from '@/components/Visor/PopUpNavbar/MouseDragPopUp.js'
  import { useAttributesLayersStore } from '@/store/AttributeLayerStore.js'
  import { getListNameEcosystemHabitats } from '@/services/service.js';

  const route = useRoute();
  const attributes_layers_store=useAttributesLayersStore();
  const props = defineProps({
    id:{ required:true, type: String}
  })
  const titlePopUp="Attributes Layers";
  const transformAttribute=(name_attribute)=>{
    let name_attr=name_attribute.replace(/\s+/g, '').toLowerCase();
    if(name_attr==='hilucsmsp') return "eHILUCS code";
    else if(name_attr==='designation') return "IUCN category";
    else if(name_attr==='sitename') return "MPA name";
    else if(name_attr==='seausefct') return 'Sea Use Function';
    else if(name_attr==="color") return "Compatibility class";
    else if(name_attr==="type_buffer") return "Assessment class";
    else if(name_attr==="meters") return "Distance Buffer (meters)";
    else if(name_attr==="ecosystemservices") return "Ecosystem Service Code";
    else if(name_attr==="referenceHabitatTypeId") return "Habitat Code";
    else return name_attr;
  }
  onBeforeMount(async ()=>{
    if(route.name=='es') {
      try {
        const response = await getListNameEcosystemHabitats();
        if (response && Object.keys(response).length > 0) {
          attributes_layers_store.list_name_EcosystemServices=response.ecosystem.ecosystemServicesNames;
          attributes_layers_store.list_name_habitats=response.habitats;
        } else {
          // showTemporaryAlert('No ecosystems or habitats found.', 'warning')
        }
      } catch (error) {
        console.error('Error fetching ecosystems and habitats:', error)
        // showTemporaryAlert('Failed to load ecosystems and habitats.', 'error')
      }
    }
  })
</script>

<template>
  <div id="attributes" class="pop_up_layers popUp_visor" @mousedown="startDrag" @mouseup="stopDrag">
    <v-card>
      <template v-slot:title>
        <HeaderPopUp :title="titlePopUp" :id="props.id"></HeaderPopUp>
      </template>
      <v-card-text class="content_table_attributes">
        <template v-for="(id) in attributes_layers_store.getIdLayers()" :key="id" >
          <h2><strong>Capa:</strong> {{ id }}</h2>
          <v-table fixed-header class="mb-8" height="450px" width="80vw">
            <thead>
            <tr>
              <th v-for="(name_attribute, i) in attributes_layers_store.getNameAttributes(id)" :key="i" 
                class="header_table text-left">
                  {{transformAttribute(name_attribute)}}
              </th>
            </tr>
            </thead>
            <tbody class="content_attributes">            
              <tr  v-for=" (feature, index) in attributes_layers_store.getListAttributes(id, route.name)" :key="index">
                <td  v-for="(value, index) in Object.values(feature.properties)" :key="index"
                  class="cell_table_attributes">
                  <template v-if="route.name!='es'">
                    {{ value }}
                  </template>
                  <template v-else-if="index !== Object.values(feature.properties).length - 1">
                    {{ value }}
                  </template>
                  <template v-else>
                    <!-- Aquí lo que quieras hacer si es el último -->
                    <h5 v-for="(code) in value.split(',')" :key="code"> <strong>{{code }} </strong>:
                      {{ attributes_layers_store.list_name_EcosystemServices[code] }}
                    </h5>
                  </template>
                </td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
  #attributes{
    min-width:80vw;
    min-height: 450px;
    max-width: 80vw;
  }
  .header_table{
    background-color: #c4c4c4 !important;
  }
  .content_table_attributes{
    max-width: 80vw;
    overflow: auto;
    max-height: 80vh;
  }
  .cell_table_attributes{
    max-width: 175px;
    word-wrap: break-word;
  }
</style>