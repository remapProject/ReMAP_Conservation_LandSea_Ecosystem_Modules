<script setup>
import { onUnmounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import Layers from '@/components/Visor/PopUpNavbar/Layers.vue'
import Legends from '@/components/Visor/PopUpNavbar/Legends.vue'
import AlertUnavailableComponent from '@/components/utils/AlertInfoUnavailable.vue'
import Setting from '@/components/Visor/PopUpNavbar/setting/Setting.vue'
import Export from '@/components/Visor/PopUpNavbar/Export.vue'
import Import from '@/components/Visor/PopUpNavbar/Import.vue'
import AttributesLayers from '@/components/Visor/PopUpNavbar/AttributesLayers.vue'
import ReloadLoader from '@/components/Visor/PopUpNavbar/ReloadLoader.vue'
import Help from '@/components/Visor/PopUpNavbar/Help.vue'
import { useUnavailable } from '@/store/unableFunctionStore.js'
import { usePopUpNavbarStore } from '@/store/PopUpNavbarStore.js'
import { getLayers } from '@/services/service.js'
import { useLayersStore } from '@/store/LayersStore.js'
import { useImportLayersStore } from '@/store/ImportLayersStore'

const router = useRouter()
const store = usePopUpNavbarStore()
const unavailableStore = useUnavailable()
const rail = ref(true)
const isLoading = ref(false)
const progress = ref(0)
const currentStep = ref('')

const handleReload = async () => {
  isLoading.value = true
  await nextTick()
  console.log('hey')
  progress.value = 0
  currentStep.value = 'Connecting to the server...'
  await new Promise((resolve) => setTimeout(resolve, 500))

  try {
    const layersStore = useLayersStore()
    const importLayersStore = useImportLayersStore()

    const currentLayers = layersStore.list_layers
    layersStore.list_layers = []
    const specialLayers = currentLayers.filter(
      (layer) => importLayersStore.isImported(layer) || layer === 'mspzoningpoly'
    )
    currentStep.value = 'Obtaining updated layers...'
    const newLayers = await getLayers()
    progress.value = 30

    await new Promise((resolve) => setTimeout(resolve, 500))

    const mergedLayers = [...newLayers, ...specialLayers]
    layersStore.list_layers = mergedLayers
    progress.value = 60
    await new Promise((resolve) => setTimeout(resolve, 500))

    currentStep.value = 'Processing changes...'
    const activeLayers = [...layersStore.list_active]
    layersStore.list_active = []

    const activeSpecial = activeLayers.filter(
      (name) => importLayersStore.isImported(name) || name === 'mspzoningpoly'
    )

    const activeServer = activeLayers
      .filter((name) => !importLayersStore.isImported(name) && name !== 'mspzoningpoly')
      .filter((name) => newLayers.includes(name))

    await new Promise((resolve) => setTimeout(resolve, 500))

    currentStep.value = 'Updating view...'
    layersStore.list_active = [...activeSpecial, ...activeServer]
    progress.value = 90

    await new Promise((resolve) => setTimeout(resolve, 500))
    progress.value = 100
  } catch (error) {
    console.error('Error en recarga:', error)
    // unavailableStore.active = true;
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 500))
    isLoading.value = false
  }
}
const showPopUp = (id) => {
  store.add_PopUp(id)
}
const pushRoute = () => {
  router.push({ name: 'home' })
}
onUnmounted(() => {
  store.delete_list_popUp()
})
</script>

<template>
  <div>
    <ReloadLoader :isLoading="isLoading" :progress="progress" :currentStep="currentStep" />
    <v-card :class="['navbar_panel', { navbar_panel_active: !rail }]" @mouseenter="rail = false" @mouseleave="rail = true" :style="{ width: rail ? '57px' : '210px' }" >
      <v-navigation-drawer :rail="rail" permanent class="navbar-drawer">
        <v-list-item nav> </v-list-item>
        <v-divider></v-divider>
        <v-list density="compact" nav>
          <v-list-item @click="pushRoute" class="opacity_icon" prepend-icon="mdi-home-outline" title="Welcome" value="home" ></v-list-item>
          <v-list-item @click="showPopUp('layers')" class="opacity_icon" prepend-icon="mdi-layers-triple-outline" title="Layers" value="layers" ></v-list-item>
          <v-list-item @click="showPopUp('import')" class="opacity_icon" prepend-icon="mdi-tray-arrow-up" title="Import Layers" value="import" ></v-list-item>
          <v-list-item @click="showPopUp('setting')" class="opacity_icon" prepend-icon="mdi-tune-variant" title="Geoprocessing" value="setting" ></v-list-item>
          <v-list-item @click="showPopUp('legends')" class="opacity_icon" prepend-icon="mdi-list-box-outline" title="Legends" value="legends" ></v-list-item>
          <v-list-item @click="showPopUp('export')" class="opacity_icon" prepend-icon="mdi-cloud-download-outline" title="Export Data" value="export" ></v-list-item>
          <v-list-item @click="handleReload()" class="opacity_icon" prepend-icon="mdi-sync" title="Reload" value="reload" ></v-list-item>
        </v-list>
        <div class="div_bottom">
          <v-divider></v-divider>
          <v-list density="compact" nav>
            <!-- <v-list-item class="opacity_icon" prepend-icon="mdi-information-outline" title="Info" value="d" ></v-list-item> -->
            <v-list-item @click="showPopUp('help')" class="opacity_icon" prepend-icon="mdi-help-circle-outline" title="Help" value="help" ></v-list-item>
          </v-list>
        </div>
      </v-navigation-drawer>
    </v-card>
    <layers v-if="store.list_active['layers']" :style="{ zIndex: store.getZIndex('layers') }" id="layers" ></layers>
    <legends v-if="store.list_active['legends']" :style="{ zIndex: store.getZIndex('legends') }" id="legends" ></legends>
    <setting v-if="store.list_active['setting']" :style="{ zIndex: store.getZIndex('setting') }" id="setting" ></setting>
    <import v-if="store.list_active['import']" :style="{ zIndex: store.getZIndex('import') }" id="import" ></import>
    <export v-if="store.list_active['export']" :style="{ zIndex: store.getZIndex('export') }" id="export" ></export>
    <AttributesLayers v-if="store.list_active['attributes']" :style="{ zIndex: store.getZIndex('attributes') }" id="attributes" ></AttributesLayers>
    <help v-if="store.list_active['help']" :style="{ zIndex: store.getZIndex('help') }" id="help" ></help>
    <AlertUnavailableComponent v-if="unavailableStore.active"></AlertUnavailableComponent>
  </div>
</template>

<style scoped>
.navbar-drawer {
  max-width: 210px !important;
  transition: width 0.3s ease;
  border-top-right-radius: 10px !important;
  border-bottom-right-radius: 10px !important;
  border-top-left-radius: 0px !important;
  border-bottom-left-radius: 0px !important;
}
.navbar-drawer .v-navigation-drawer--mini {
  max-width: 60px;
}
.navbar_panel_active {
  position: fixed;
  z-index: 5;
}
.navbar_panel {
  width: 57px;
  transition: width 0.3s ease !important;
  border-top-right-radius: 10px !important;
  border-bottom-right-radius: 10px !important;
  border-top-left-radius: 0px !important;
  border-bottom-left-radius: 0px !important;
}
.opacity_icon * {
  opacity: initial !important;
  background-color: transparent !important;
}
.opacity_icon .v-list-item__preprend .v-avatar .v-responsive {
  max-height: 50% !important;
  height: 100% !important;
  max-width: 85% !important;
  width: 100% !important;
}
.div_bottom {
  width: 100%;
  position: fixed;
  bottom: 0;
}

.v-list-item {
  transition: all 0.2s ease !important;
}

.v-list-item:hover {
  border-left: 3px solid rgb(var(--v-theme-primary)) !important;
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}
</style>
