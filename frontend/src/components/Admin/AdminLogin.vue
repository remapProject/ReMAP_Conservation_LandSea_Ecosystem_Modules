<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminLogin } from '@/services/admin.service'

const username = ref('')
const password = ref('')
const error = ref(null)
const router = useRouter()

const login = async () => {
  error.value = null
  try {
    const { token } = await adminLogin({
      username: username.value,
      password: password.value
    })

    localStorage.setItem('adminToken', token)
    router.push('/admin/dashboard')
  } catch (err) {
    error.value = 'Incorrect credentials. Please try again.'
    password.value = ''
  }
}
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <div class="bg-gradient"></div>
    <v-card width="380" class="pa-6 rounded-lg" elevation="12">
      <v-card-title class="text-center mb-2">
        <v-avatar color="primary" size="56" class="mb-4">
          <v-icon icon="mdi-shield-account" size="x-large"></v-icon>
        </v-avatar>
        <h2 class="text-h4 font-weight-bold text-primary">Admin Panel</h2>
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="login">
          <v-text-field
            v-model="username"
            label="Username"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            class="mb-4"
            required
          />

          <v-text-field
            v-model="password"
            label="Password"
            prepend-inner-icon="mdi-lock"
            variant="outlined"
            type="password"
            required
            @input="error = null"
          />

          <v-slide-x-transition>
            <v-alert v-if="error" type="error" density="compact" class="mb-4" variant="tonal">
              {{ error }}
            </v-alert>
          </v-slide-x-transition>

          <v-btn
            type="submit"
            color="primary"
            size="large"
            block
            rounded="lg"
            class="mt-4 mx-auto"
            style="width: 90%"
          >
            Sign In
            <template v-slot:loader>
              <v-progress-circular indeterminate size="24"></v-progress-circular>
            </template>
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style scoped>
.bg-gradient {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  z-index: -1;
}

.v-card {
  transition: transform 0.3s ease;
  width: 90%;
  max-width: 380px;
  margin: auto;
  box-sizing: border-box;
  overflow: hidden;
}

.v-card:hover {
  transform: translateY(-2px);
}

.v-btn {
  transition: transform 0.2s ease;
  padding: 0 24px;
}

.v-btn:hover {
  transform: scale(1.02);
  transition: transform 0.2s ease;
}

@media (max-width: 600px) {
  .v-card {
    width: 95%;
    margin: 0 12px;
  }
}
</style>
