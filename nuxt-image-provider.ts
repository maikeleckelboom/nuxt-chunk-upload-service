import type { ProviderGetImage } from '@nuxt/image'
import { createOperationsGenerator } from '#image'

const operationsGenerator = createOperationsGenerator()

export const getImage: ProviderGetImage = (src, { modifiers = {}, options = {} } = {}) => {

  const operations = operationsGenerator(modifiers)

  return {
    url: src + (operations ? '?' + operations : ''),
  }
}