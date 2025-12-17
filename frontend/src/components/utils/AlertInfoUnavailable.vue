<script setup>
import { useUnavailable } from '@/store/unableFunctionStore';

const unavailableStore = useUnavailable();
</script>

<template>
  <v-container class="alert_container" max-width="700px">
   <v-alert closable icon="$info" :title="unavailableStore.title" 
      text="We're sorry, but this feature is temporarily unavailable" 
      type="info" :color="'#ffd30f'"
      @click:close="unavailableStore.setActive(false)"
      >
   </v-alert>
  </v-container>
</template>

<style scoped>
.alert_container{
  position: absolute;
  top: 50%;
  left: 27.5%;
  z-index: 50;
}
#title_dialog_download {
  font-weight: 600;
}
.title_content_dialog {
  display: flex;
  justify-content: center;
}
#title_div {
  width: fit-content;
  font-weight: 500;
}

.actions {
  display: contents;
  /*justify-content: center !important;*/
}
.btn_excel,
.btn_pdf,
.btn_csv,
.btn_ppt {
  background-color: var(--color-orange);
  color: white !important;
  text-transform: initial;
}
.btn_excel {
  background-color: #05525c !important;
}
.btn_csv {
  background-color: #ba4b30 !important;
}
.btn_ppt {
  background-color: #023139 !important;
}
</style>
