<script setup>
import HeaderPopUp from '@/components/Visor/PopUpNavbar/HeaderPopUp.vue'
import { ref } from 'vue'
import { startDrag, stopDrag } from '@/components/Visor/PopUpNavbar/MouseDragPopUp.js'
import { usePopUpNavbarStore } from '@/store/PopUpNavbarStore.js'

const titlePopUp = 'Help Center'
const helpContent = ref([])
const popup_store = usePopUpNavbarStore()

fetch('/help/help.json')
  .then((response) => response.json())
  .then((data) => (helpContent.value = data))
</script>

<template>
  <div
    v-if="popup_store.list_active['help']"
    class="pop_up_layers popUp_visor"
    @mousedown="startDrag"
    @mouseup="stopDrag"
  >
    <v-card class="help-card">
      <template v-slot:title>
        <HeaderPopUp :title="titlePopUp" id="help" />
      </template>
      <v-card-text class="help-content">
        <v-expansion-panels variant="accordion">
          <v-expansion-panel v-for="(item, index) in helpContent" :key="index" class="help-panel">
            <v-expansion-panel-title class="panel-title" collapse-icon="" expand-icon="">
              <template v-slot:default="{ expanded }">
                <div class="title-wrapper">
                  <span class="title-text">{{ item.title }}</span>
                  <v-icon
                    :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    class="expand-icon"
                  ></v-icon>
                </div>
              </template>
            </v-expansion-panel-title>
            <v-expansion-panel-text class="panel-content">
              {{ item.content }}
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.expand-icon {
  margin-left: auto;
  font-size: 1.2rem;
  color: #6c757d;
}
.title-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
}
</style>
