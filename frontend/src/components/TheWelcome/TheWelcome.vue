<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
  import logo from '@/assets/logoRemap.png';
  import ToolDescription from '@/components/TheWelcome/ToolDescription.vue'
  import Tools from '@/components/TheWelcome/Tools.vue'
  import PresentationProject from '@/components/TheWelcome/PresentationProject.vue'

  const list_buttons_header=[
    { label: 'Home', value: 'home' },
    { label: 'Tools', value: 'tools' }
  ];
  const selected=ref(list_buttons_header[0].value);
  const isFooterVisible = ref(false);
  const isScrolledToFooter = ref(false);
  const footerRef = ref(null);
  const sectionTools=ref(null);
  const sectionProject=ref(null);
  const sectionDescription=ref(null);
  const scrollSection=(btn)=>{
    selected.value = btn;
    if(btn=='tools') {
      sectionTools.value.scrollIntoView({behavior:'smooth'})
    }else if(btn=='information'){
      sectionDescription.value.scrollIntoView({ behavior: 'smooth' })

    }else{
      sectionProject.value.scrollIntoView({behavior:'smooth'});
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateButtonPosition = () => {
    if (footerRef.value) {
      const footerRect = footerRef.value.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      isFooterVisible.value =footerRect.top < windowHeight && footerRect.top > 0;

      if (isFooterVisible.value) {
        isScrolledToFooter.value=true;
        let btn=document.getElementById('btn_top');
        let newPosition=windowHeight - footerRect.top + 20;
        btn.style.bottom=`${newPosition}px`;
      } else {
        isScrolledToFooter.value=false;
      }
    }
  };
  onMounted(() => {
    window.addEventListener('scroll', updateButtonPosition);
    updateButtonPosition();
  });
  onUnmounted(() => {
    window.removeEventListener('scroll', updateButtonPosition);
  });
</script>
<template>
  <div id="welcome">
    <header id="header_welcome">
      <v-img
        :width="200"
        aspect-ratio="16/9"
        cover
        :src="logo"
      ></v-img>
      <div id="div_header">
        <v-btn
          v-for="btn in list_buttons_header"
          :key="btn.value"
          @click="scrollSection(btn.value)"
          :class="['btn_header',{ active: selected === btn.value }, { btn_active: selected === btn.value },{btn_info: btn.value=='information'}]"
          plain
          :color="(selected===btn.value)? '#023139':'#756f83'"
        >
          {{ btn.label }}
        </v-btn>
      </div>
    </header>
    <div ref="sectionProject">
      <PresentationProject></PresentationProject>
    </div>
    <div ref="sectionTools">
    <Tools></Tools>
    </div>
    <v-btn @click="scrollToTop" v-if="true" :class="{ 'scrolled-to-footer': isScrolledToFooter }" id="btn_top" size="75"> <v-icon size="45" icon="mdi-arrow-up"></v-icon></v-btn>
    <div ref="footerRef">
      <v-footer id="footer_welcome" >
        <h3>Andrej Abramic, Project Coordinator</h3>
        <address><a style="text-decoration: underline">andrej.abramic@ulpgc.es</a></address>
        <h3>Communication and Press Office</h3>
        <address><a style="text-decoration: underline">remap@cetmar.org</a></address>
        <br/>
        <h6>ALL RIGHTS RESERVED · ReMAP</h6>
      </v-footer>
    </div>
  </div>
</template>
<style scoped>
#welcome{
  background: linear-gradient(to bottom, white, #E8C7BF);

}
#header_welcome{
  padding: 20px 60px;
  display: flex;
  align-items: center;
}
#div_header{
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: flex-end;
  font-family: 'Mulish';
  font-weight: bold;
}
.btn_header, btn_header *{
  font-size: 16px;
  color: var(--color-grey-header) !important;
  border: none !important;
  background: transparent !important;
  text-transform: initial;
  box-shadow: none !important;
}
.btn_header:hover{
  box-shadow: none !important;
  color: var(--color-dark-blue) !important;
  background-color: transparent !important;
  border: none !important;
  font-weight: 800 !important;
  font-size: 17px;
}
.btn_header:focus-visible, .btn_header:active, .btn_active{
  text-decoration: underline;
  text-decoration-color: var(--color-dark-blue);
  text-underline-offset: 15px;
  color: var(--color-dark-blue) !important;

}
.btn_info{
  width: 7.5%;
}
#btn_top{
  position: fixed;
  bottom: 2.5%;
  right: 2.5%;
  z-index: 5;
  background-color: transparent !important;
  box-shadow: none !important;
  border-radius: 50px !important;
  transition: bottom 0.01s ease-in-out;
}
#btn_top  * {
    color: var(--color-dark-blue);
}
#footer_welcome{
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 5%;
  color: white;
  background: linear-gradient(183.41deg, #064D56 -8.57%, #02323C 82.96%);
}
</style>