import english from 'element-plus/es/locale/lang/en'

const loaders = {
  zh: () => import('element-plus/es/locale/lang/zh-cn'),
  'zh-Hant': () => import('element-plus/es/locale/lang/zh-tw'),
  es: () => import('element-plus/es/locale/lang/es'),
  fr: () => import('element-plus/es/locale/lang/fr'),
  ja: () => import('element-plus/es/locale/lang/ja'),
  ko: () => import('element-plus/es/locale/lang/ko'),
  de: () => import('element-plus/es/locale/lang/de'),
  pt: () => import('element-plus/es/locale/lang/pt-br'),
  ru: () => import('element-plus/es/locale/lang/ru'),
  it: () => import('element-plus/es/locale/lang/it'),
  id: () => import('element-plus/es/locale/lang/id'),
  vi: () => import('element-plus/es/locale/lang/vi'),
  tr: () => import('element-plus/es/locale/lang/tr'),
  ar: () => import('element-plus/es/locale/lang/ar'),
  hi: () => import('element-plus/es/locale/lang/hi'),
}
const cache = new Map([['en', Promise.resolve(english)]])

export function hasElementLocale(code) {
  return code === 'en' || Boolean(loaders[code])
}

export function loadElementLocale(code) {
  if (cache.has(code)) return cache.get(code)
  if (!loaders[code]) return Promise.reject(new Error(`Component locale ${code} is unavailable`))
  const result = loaders[code]().then(module => module.default).catch(error => {
    cache.delete(code)
    throw error
  })
  cache.set(code, result)
  return result
}
