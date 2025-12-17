<script setup>
const props = defineProps({
  info: { required: true, type: String },
  type: { type:String}
})
</script>
<template>
  <h5 :class="['info_setting',{'info':type}]">
    <v-icon :icon="(!props.type)?'mdi-alert-circle':'mdi-information'" :color="(props.type)?'blue':'red'" size="25"></v-icon>
  {{ props.info }}
  </h5>
</template>

<style scoped>
.info_setting {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #fff3cd;
  color: #856404;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 16px;
}

</style>