<script setup>
import { ref } from 'vue'
const props = defineProps({
  title: {
    type: String,
    default: 'Information',
    required: true,
  },
  text: {
    type: String,
    default: "Description of the alert goes here.",
    required: true
  }, 
  show: {
    type:Boolean,
    default: true
  }
});
const show = ref(props.show)
</script>

<template>
  <div class="div_alert" v-if="show">
  <v-container class="alert_container" max-width="700px">
   <v-alert closable icon="$info" 
      :text="props.text" 
      type="info" 
      :color="'var(--color-orange)'"
      @click:close="show=false"
      >
      <template v-slot:title>
        <div id="title_div">{{props.title}}</div>
      </template>
      <template v-slot:text >
        <div class="content_text_alert" v-html="props.text">
        </div>
      </template>
   </v-alert>
  </v-container>
  </div>
</template>

<style scoped>
.div_alert{
  background-color: rgba(0, 0, 0, 0.425);
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 50;
}
.alert_container{
  position: relative;
  top: 30%;
}
.alert_container *{
  color: white !important;

}

.content_text_alert {
  font-size: 16px;
  font-weight: 400;
  margin-top: 10px;
}

#title_div {
  width: fit-content;
  font-weight: 600;
  font-size: 20px;
  margin: auto;
}

</style>
