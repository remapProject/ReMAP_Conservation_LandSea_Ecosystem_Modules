<script setup>
import { computed } from 'vue';

const props = defineProps({
  isLoading: Boolean,
  progress: Number,
  currentStep: String
})
const isLoading = computed(() => props.isLoading);
</script>

<template>
  <v-dialog v-model="isLoading" persistent width="300">
    <v-card>
      <v-card-text class="text-center">
        <p class="mb-2 text-caption">{{ currentStep }}</p>
        <v-progress-linear 
          :model-value="progress" 
          color="primary" 
          height="20" 
          striped
        >
          <template v-slot:default="{ value }">
            <strong>{{ Math.ceil(value) }}%</strong>
          </template>
        </v-progress-linear>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.v-dialog {
  z-index: 9999 !important;
}
</style>
