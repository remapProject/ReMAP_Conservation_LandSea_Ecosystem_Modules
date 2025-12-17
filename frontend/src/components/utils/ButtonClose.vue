<script setup>
import { usePopUpNavbarStore } from '@/store/PopUpNavbarStore.js'

const popup_store=usePopUpNavbarStore();

const props= defineProps({
  id:{required:true, type:String},
  disabled: {type: Boolean, default: false}
})
const close=()=>{
  if (!props.disabled) {
    popup_store.close_PopUp(props.id)
    popup_store.delete_PopUp(props.id);
  }
}
</script>

<template>
  <v-btn 
    @click="close" 
    size="small" 
    density="comfortable" 
    :color="'var(--color-dark-blue)'" 
    icon
    :disabled="disabled"
  >
    <template #default>
      <v-icon color="white">mdi-close</v-icon>
    </template>
  </v-btn>
</template>

<style scoped>

</style>