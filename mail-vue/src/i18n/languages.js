export const languages = [
    {code: 'zh', name: '简体中文', intl: 'zh-CN'},
    {code: 'en', name: 'English', intl: 'en-US'},
    {code: 'es', name: 'Español', intl: 'es-ES'},
    {code: 'fr', name: 'Français', intl: 'fr-FR'},
    {code: 'ja', name: '日本語', intl: 'ja-JP'},
    {code: 'ko', name: '한국어', intl: 'ko-KR'},
    {code: 'de', name: 'Deutsch', intl: 'de-DE'},
    {code: 'pt', name: 'Português', intl: 'pt-BR'},
    {code: 'ru', name: 'Русский', intl: 'ru-RU'},
]

const supported = new Set(languages.map(({code}) => code))

export function normalizeLanguage(value) {
    if (typeof value !== 'string') return null
    const code = value.toLowerCase().split(/[-_]/)[0]
    return supported.has(code) ? code : null
}

export function getBrowserLanguage() {
    const preferred = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const value of preferred) {
        const code = normalizeLanguage(value)
        if (code) return code
    }
    return 'en'
}

export function resolveLanguage(selection, browserLanguage = getBrowserLanguage()) {
    return normalizeLanguage(selection) || browserLanguage
}

export function intlLanguage(code) {
    return languages.find(language => language.code === code)?.intl || 'en-US'
}
