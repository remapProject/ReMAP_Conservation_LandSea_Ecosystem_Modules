import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLoadingStore = defineStore('LoadingStore', () => {
   const isLoading = ref(false);
   const activeLoading = () => {
      isLoading.value = true;
   };
    const disactiveLoading = () => {
        isLoading.value = false;
    };
  return { isLoading, activeLoading, disactiveLoading };
});