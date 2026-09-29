import { createI18n } from 'vue-i18n';
import en from './en.js'
import zh from './zh.js'
const i18n = createI18n({
    legacy: false,
    messages: {
        zh,
        en
    },
});

export function getBrowserLanguage() {
    const preferred = navigator.languages?.[0] || navigator.language || 'en'
    return preferred.toLowerCase().split('-')[0] === 'zh' ? 'zh' : 'en'
}

export function resolvePublicMailboxLanguage(selection, browserLanguage) {
    return selection === 'zh' || selection === 'en' ? selection : browserLanguage
}

export default i18n;
