import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUnavailable = defineStore('UnavailableStore', () => {
   const active = ref(false);
   const title = ref('')
   const setActive = (value) => {
      active.value = value;
   };
   const setTitle = (value) => {
      title.value = value;
   };
  return { active, title, setActive, setTitle };
});