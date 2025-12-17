<script setup>
  import { useLoadingStore } from '@/store/LoadingStore';
  const loadingStore = useLoadingStore();

</script>
<template>
  <v-progress-circular v-if="loadingStore.isLoading" indeterminate size="36" color="white"></v-progress-circular>
</template>


<style>

</style>