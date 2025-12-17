<script setup>
  import ButtonClose from '@/components/utils/ButtonClose.vue'

  const props= defineProps({
    title:String,
    id:{ required:true, type:String },
    disabled: { type: Boolean, default: false }
  })
</script>

<template>
  <div class="title_card">
    <v-card-title class="title_popup">{{props.title}}</v-card-title>
    <button-close :id="props.id" :disabled="props.disabled"></button-close>
  </div>
</template>

<style scoped>
.title_card{
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
.title_popup{
  font-weight: bolder;
}
</style>