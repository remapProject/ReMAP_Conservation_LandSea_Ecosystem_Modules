import { createRouter, createWebHistory } from 'vue-router'
import TheWelcome from '@/components/TheWelcome/TheWelcome.vue'
import LandSea from '@/components/VisorModules/VisorModule.vue'
import AdminLogin from '@/components/Admin/AdminLogin.vue'
import AdminDashboard from '@/components/Admin/AdminDashboard.vue'
import { checkAuth } from '@/services/admin.service'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: TheWelcome,
      meta: { title: 'Welcome' }
    },  
    {
      path: '/land_sea_interaction',
      name: 'lsi',
      component: LandSea,
      meta: { title: 'Land Sea Interactions' }
    },
    {
      path: '/conservation_msp',
      name: 'msp',
      component: LandSea,
      meta: { title: 'Conservation MSP' }
    },
    {
      path: '/ecosystem_service',
      name: 'es',
      component: LandSea,
      meta: { title: 'Ecosystem Services' }
    },
    {
      path: '/admin/login',
      name: 'AdminLogin',
      component: AdminLogin
    },
    {
      path: '/admin/dashboard',
      name: 'AdminDashboard',
      component: AdminDashboard,
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  if (to.meta.requiresAuth) {
    const isAuthenticated = await checkAuth()
    if (isAuthenticated) {
      next()
    } else {
      next('/admin/login')
    }
  } else {
    next()
  }
})

export default router
