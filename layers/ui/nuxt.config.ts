import {dirname, join} from 'path'
import {fileURLToPath} from 'url'
import {defineNuxtConfig} from 'nuxt/config'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
    modules: [
        join(currentDir, './nuxt.module.ts'),
        "@nuxtjs/google-fonts",
        "@nuxtjs/tailwindcss",
        "@nuxtjs/color-mode",
        "nuxt-lucide-icons",
        "shadcn-nuxt",
    ],
    tailwindcss: {
        viewer: false,
        cssPath: join(currentDir, './assets/css/tailwind.css'),
    },
    colorMode: {
        classSuffix: "",
        preference: "system",
        fallback: "light",
    },
    googleFonts: {
        families: {
            Roboto: true
        }
    },
    shadcn: {
        prefix: '',
        componentDir: join(currentDir, './components/ui'),
    },
    imports: {
        presets: [
            {
                imports: ['capitalize'],
                from: 'vue'
            },
            {
                imports: ['cva'],
                from: 'class-variance-authority'
            },
            {
                imports: ['toTypedSchema'],
                from: '@vee-validate/zod'
            },
            {
                imports: ['z'],
                from: 'zod'
            },
            {
                imports: ['useForm'],
                from: 'vee-validate'
            },
        ]
    },

    lucide: {
        namePrefix: 'Icon'
    },

    // viewport: {
    //     breakpoints: {
    //         xs: 320,
    //         sm: 640,
    //         md: 768,
    //         lg: 1024,
    //         xl: 1280,
    //         '2xl': 1536
    //     },
    //     defaultBreakpoints: {
    //         desktop: 'lg',
    //         mobile: 'xs',
    //         tablet: 'md'
    //     },
    //     fallbackBreakpoint: 'lg'
    // }
})
