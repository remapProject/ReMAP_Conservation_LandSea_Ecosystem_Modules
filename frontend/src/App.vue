<script setup>
  import { RouterView } from 'vue-router'
  import { onMounted, ref } from 'vue'
  const isDev = import.meta.env.MODE === 'development';
  const isVueDevToolsActive = ref(false); // Estado para verificar si Vue DevTools está activado

  const click= ref(false);
  const changeStyleVueDevTools=()=>{
    let toogle=document.getElementsByClassName("vue-devtools__anchor")[0];
    if(!click.value) {
      toogle.id='toogle_vue';
    }else{
      toogle.id='';
    }
    click.value = !click.value;
  }
  onMounted(() => {
    isVueDevToolsActive.value = window.__VUE_DEVTOOLS_GLOBAL_HOOK__ !== undefined;
  });
</script>

<template>
  <v-layout class="no-style-layout">
    <v-btn id="btn_dev" v-if="isDev && isVueDevToolsActive" @click="changeStyleVueDevTools">{{ !click ? 'Hide VueDevTools':'Show VueDevTools'}}</v-btn>
    <RouterView />
  </v-layout>
</template>

<style scoped>
.no-style-layout {
  all: unset; /* Elimina todos los estilos */
  display: block; /* Puedes agregar esta línea si quieres que el layout tenga un display válido */
}
#btn_dev{
  position: absolute;
  top:50px;
  right: 0;
  background-color: red;
  color: white;
  z-index: 5;
}
</style>
