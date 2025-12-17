<script setup>
  import { useRouter } from 'vue-router'
  import conservation from '@/assets/conservation.png'
  import landsea from '@/assets/landsea.png'
  import ecosystem from '@/assets/ecosystem.png'

  const tools = [
    {title: 'Conservation MSP', value:'msp', img:conservation,
    description:`
      This module analyses the (in)compatibilities between marine conservation areas 
      (MPAs) and maritime activities included in approved or proposed Maritime Spatial 
      Plans (MSP), helping users to explore potential conflicts and synergies in 
      marine space use.
    `
    },
    {title: 'Land-Sea Interactions Analytical', value:'lsi', img:landsea, description: `
      This module analyses the conflict and compatibilities between Costal Land Use and 
      Maritime Activities included in approved or proposed Maritime Spatial 
      Plans (MSP), helping users to explore potential conflicts and synergies in 
      marine space use.
      `
    },
    {title: 'Ecosystem Services', value:'es', img:ecosystem, description:''},
    {title: 'Input Data', value:'ID', img:'' , description:`
      This module is prepared to develop an exploratory analysis of the data 
      considered for the development of the Maritime Spatial Plans (MSPs). 
      Through an auto-assessment approach, it evaluates the data employed, 
      identifies gaps or missing datasets, highlights areas where updates 
      are needed, and examines how the quality and completeness of the input 
      data might influence the MSP.
      `
    },
  ]
  const router=useRouter();
  const pushTools = (tool)=>{
      router.push({name: tool});
  }
</script>
<template>
  <div id="section_tools">
    <v-container id="sections_content_tools">
      <v-card @click="pushTools(tool.value)" class="card_tool" v-for="tool in tools" :key="tool.value">
          <v-img class="card_img_tool"
            :width="'100%'"
            :src="tool.img"
          ></v-img>
          <v-card-title>{{ tool.title }}</v-card-title>
        <v-card-text>{{ tool.description }}</v-card-text>
      </v-card>
    </v-container>
    <div class="background_svg_1">
      <svg width="280%" viewBox="0 0 1427 886" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M-119.882 151.147C-23.5865 54.8888 186.353 196.116 475.778 153.344C726.453 116.274 733.161 -15.0964 936.208 1.57105C1084.55 13.7227 1250.28 95.5045 1346.62 228.377C1452.85 374.88 1425.91 517.287 1418.02 551.776C1382.85 706.483 1255.58 782.664 1210.63 808.61C1025.41 915.434 808.559 884.269 704.529 869.362C313.749 813.259 -116.553 553.231 -150.603 292.181C-155.097 258.003 -163.348 194.616 -119.882 151.147Z" fill="url(#paint0_linear_4_27)"/>
        <defs>
          <linearGradient id="paint0_linear_4_27" x1="-60.9999" y1="-745.683" x2="3347.83" y2="964.904" gradientUnits="userSpaceOnUse">
            <stop/>
            <stop offset="25%"/>
            <stop offset="35%"/>
            <stop offset="45%"/>
            <stop offset="65%"/>
            <stop offset="100%"/>
          </linearGradient>
        </defs>
      </svg>
  </div>
  </div>
</template>

<style scoped>
#section_tools{
  position: relative;
  z-index: 1;
}
#sections_content_tools{
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex-wrap: wrap;
  align-items: center;
}
.card_tool{
  margin: 2.5%;
  width: 35%;
  min-width: 35%;
  max-width: 35%;
  height: 550px;
  display: flex;
  flex-direction: column;
  justify-items: center;
}
.card_tool .v-card-title{
  margin: 0 auto;
  font-weight: bold !important;
  color: var(--color-dark-blue);
}
.card_tool .v-card-text{
  color: var(--color-grey-header);
}
.card_img_tool{
  margin: 0 auto;
}
.background_svg_1 {
  z-index: -1;
  position: absolute;
  top: 0;
  left: 0;
  margin-top: 7.5%;
}
.background_svg_1  svg stop:nth-child(1) {
  stop-color: #fff;
}
.background_svg_1  svg stop:nth-child(2) {
  stop-color: #91b9bd;
}
.background_svg_1  svg stop:nth-child(3) {
  stop-color: #4f929e;
}
.background_svg_1  svg stop:nth-child(4) {
  stop-color: #036f77;
}

</style>