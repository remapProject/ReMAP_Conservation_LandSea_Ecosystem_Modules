<script setup>
  import { useRouter } from 'vue-router'

  const tools = [
    {
      title: 'Conservation MSP',
      description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi, ' +
        'ratione debitis quis est labore voluptatibus! Eaque cupiditate minima, at ' +
        'placeat totam, magni doloremque veniam neque porro libero rerum unde voluptatem!',
      value: 'msp'
    },
    {
      title: 'Land-Use Interactions',
      description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi, ' +
        'ratione debitis quis est labore voluptatibus! Eaque cupiditate minima, at ' +
        'placeat totam, magni doloremque veniam neque porro libero rerum unde voluptatem!',
      value: 'lsi'
    },
    {
      title: 'Ecsystem Services',
      description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi, ' +
        'ratione debitis quis est labore voluptatibus! Eaque cupiditate minima, at ' +
        'placeat totam, magni doloremque veniam neque porro libero rerum unde voluptatem!',
      value: 'es'
    }
  ]
  const router=useRouter();
  const pushTools = (tool)=>{
    router.push({name: tool});
  }
</script>

<template>
  <div id="section_description">
    <v-container :class="['section_tool_description', {section_normal_direction: i%2!==0}, {section_reverse_direction: i%2===0}]" v-for="(tool, i) in tools" :key="tool.value">
      <v-card :class="['card_text_tool', {card_normal: i%2 ===0}]">
        <v-card-title><h2 class="title">{{ tool.title }}</h2></v-card-title>
        <v-card-text> {{tool.description}} </v-card-text>
        <v-card-actions>
          <v-btn @click="pushTools(tool.value)" class="btn_go btn_blue">Go Tool</v-btn>
        </v-card-actions>
      </v-card>
      <v-img :max-width="500" aspect-ratio="4/3" cover
        src="https://cdn.vuetifyjs.com/images/parallax/material.jpg">
      </v-img>
    </v-container>
    
    <div class="background_svg_2">
      <div>
      <svg width="100%" viewBox="0 0 1357 779" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.6" clip-path="url(#clip0_4_231)">
          <path d="M1536.08 392.886C1454.68 478.683 1253.69 422.242 992.518 509.128C766.313 584.398 768.992 676.835 582.638 705.419C446.494 726.319 289.818 702.367 193.035 629.26C86.3047 548.657 101.345 444.566 106.232 419.086C127.963 304.836 238.966 226.839 278.239 199.957C440.054 89.2521 639.973 67.9936 735.877 57.7646C1096.14 19.4145 1506.11 114.682 1554.66 288.999C1561.05 311.814 1572.82 354.145 1536.08 392.886Z" fill="url(#paint0_linear_4_231)"/>
        </g>
        <defs>
          <linearGradient id="paint0_linear_4_231" x1="286.756" y1="690.305" x2="894.122" y2="-124.933" gradientUnits="userSpaceOnUse">
            <stop stop-color="#496771"/>
            <stop offset="0.323" stop-color="#86A4AC"/>
            <stop offset="0.748" stop-color="#DAC0BA"/>
            <stop offset="1" stop-color="#E3B9A9"/>
          </linearGradient>
          <clipPath id="clip0_4_231">
            <rect width="1396.29" height="729.55" fill="white" transform="matrix(-0.997485 -0.0708818 0.364393 -0.931245 1392.89 778.758)"/>
          </clipPath>
        </defs>
      </svg>
      </div>
    </div>
    </div>
</template>

<style scoped>
#section_description{
  position: relative;
  z-index: 1;
  margin-bottom: 5%;
}
.section_tool_description{
  display: flex;
  margin: 5% 10% auto;
  justify-items: center;
  justify-content: space-between;
  max-width: 80%;
}
.section_normal_direction{
  flex-direction: row;
}
.section_reverse_direction{
  flex-direction: row-reverse;
}
.section_tool_description, .section_tool_description *{
  background-color: transparent !important;
}
.card_text_tool{
  max-width: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.card_normal{
  margin-left: 2.5%;
}
.card_text_tool:hover,.card_text_tool{
  box-shadow: none !important;
  border: none !important;
}
.btn_go {
  color: var(--color-dark-blue) !important;
}
.btn_go *{
  font-weight: bold !important;
}

.background_svg_2{
  z-index: -5;
  position: absolute;
  top: 25%;
  left: 0;
  width: 100%;
  //height: 100%;
}
.background_svg_2 div{
  float: right;
  width: 65%;
}
</style>