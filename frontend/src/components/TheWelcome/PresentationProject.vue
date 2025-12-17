<script setup>
import landing from '@/assets/landing.png'
</script>

<template>
  <div id="section_presentation_project">
    <v-card id="text_presentation_project">
      <v-card-title><h2 id="title_presentacion" class="title">Project ReMAP</h2></v-card-title>
      <v-card-text id="description_presentation_project">
        ReMAP is designed to strengthen the capability to monitor and 
        assess Maritime Spatial Planning (MSPs). REMAP develops models 
        and web tools based on an innovative technical framework, making 
        the most of already operative data infrastructures, data collections and EU initiatives. 
      </v-card-text>
      <v-card-actions>
        <v-btn href="https://remap.cetmar.org/" id="btn_presentation_project" class="btn_blue">Go to landing page</v-btn>
      </v-card-actions>
    </v-card>
    <v-img
      :width="150"
      aspect-ratio="4/3"
      :src="landing"
      class="img_welcome_project"
    ></v-img>
  </div>
</template>

<style scoped>
.img_welcome_project{
  width: 25% !important;
  height: 50vh;
}
#section_presentation_project{
  display: flex;
  flex-direction: row;
  padding: 5%;
}
#text_presentation_project {
  width: 50%;
  border: none;
  background-color: transparent;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: stretch;
}
#title_presentacion{
  margin-bottom: 10%;
}
#description_presentation_project {
  height: fit-content;
}
#btn_presentation_project{
  background-color: var(--color-dark-blue);
  color: white;
}
</style>