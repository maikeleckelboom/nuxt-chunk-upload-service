// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',

  typescript: {
    typeCheck: false,
    strict: true
  },

  future: {
    compatibilityVersion: 4
  },

  devtools: { enabled: true },

  modules: ['nuxt-auth-sanctum', '@vueuse/nuxt', '@nuxt/image'],


  image: {
    provider: 'storage',
    providers: {
      static: {
        name: 'storage',
        provider: '~~/nuxt-image-provider.ts',
        options: {}
      }
    }
  },


  runtimeConfig: {
    public: {
      sanctum: {
        baseUrl: process.env.NUXT_SANCTUM_BASE_URL
      }
    }
  },

  sanctum: {
    baseUrl: process.env.NUXT_SANCTUM_BASE_URL || 'localhost:8000',
    origin: process.env.NUXT_SANCTUM_ORIGIN || 'localhost:8000',
    endpoints: {
      user: process.env.NUXT_SANCTUM_USER_ENDPOINT || '/user'
    },
    redirect: {
      keepRequestedRoute: true,
      onLogout: process.env.NUXT_SANCTUM_REDIRECT_ON_LOGOUT || '/login',
      onAuthOnly: process.env.NUXT_SANCTUM_REDIRECT_ON_AUTH_ONLY || '/login',
      onLogin: process.env.NUXT_SANCTUM_REDIRECT_ON_LOGIN || '/',
      onGuestOnly: process.env.NUXT_SANCTUM_REDIRECT_ON_GUEST_ONLY || '/login'
    }
  }
})