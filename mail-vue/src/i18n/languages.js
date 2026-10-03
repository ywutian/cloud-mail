const existing = [
    ['zh', '简体中文', 'zh-CN'],
    ['en', 'English', 'en-US'],
    ['es', 'Español', 'es-ES'],
    ['fr', 'Français', 'fr-FR'],
    ['ja', '日本語', 'ja-JP'],
    ['ko', '한국어', 'ko-KR'],
    ['de', 'Deutsch', 'de-DE'],
    ['pt', 'Português (Brasil)', 'pt-BR'],
    ['ru', 'Русский', 'ru-RU'],
    ['it', 'Italiano', 'it-IT'],
    ['id', 'Bahasa Indonesia', 'id-ID'],
    ['vi', 'Tiếng Việt', 'vi-VN'],
    ['tr', 'Türkçe', 'tr-TR'],
    ['ar', 'العربية', 'ar-SA'],
    ['hi', 'हिन्दी', 'hi-IN'],
]

const expanded = [
    ['zh-Hant', '繁體中文', 'zh-TW'],
]

const rightToLeft = new Set(['ar', 'fa', 'he', 'ps', 'sd', 'ug', 'ur', 'yi'])

export const languages = [
    ...existing.map(([code, name, intl]) => ({code, name, intl, dir: rightToLeft.has(code) ? 'rtl' : 'ltr', coverage: 'existing'})),
    ...expanded.map(([code, name, intl = code]) => ({code, name, intl, dir: rightToLeft.has(code) ? 'rtl' : 'ltr', coverage: 'preview'})),
]

const byCode = new Map(languages.map(language => [language.code, language]))
const aliases = new Map([
    ['iw', 'he'], ['jw', 'jv'], ['tl', 'fil'], ['no', 'nb'],
])

export function normalizeLanguage(value) {
    if (typeof value !== 'string') return null
    const parts = value.toLowerCase().trim().replaceAll('_', '-').split('-')
    const base = parts[0]
    if (base === 'zh') {
        if (parts.some(part => ['hant', 'tw', 'hk', 'mo'].includes(part))) return 'zh-Hant'
        return 'zh'
    }
    if (base === 'pt') return 'pt'
    const code = aliases.get(base) || base
    return byCode.has(code) ? code : null
}

export function getBrowserLanguage() {
    if (typeof navigator === 'undefined') return 'en'
    const preferred = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const value of preferred) {
        const code = normalizeLanguage(value)
        if (code) return code
    }
    return 'en'
}

export function resolveLanguage(selection, browserLanguage = getBrowserLanguage()) {
    return normalizeLanguage(selection) || normalizeLanguage(browserLanguage) || 'en'
}

export function intlLanguage(code) {
    return byCode.get(normalizeLanguage(code))?.intl || 'en-US'
}

export function languageDirection(code) {
    return byCode.get(normalizeLanguage(code))?.dir || 'ltr'
}

export function manifestPath(code, temporary = false) {
    return `/manifest-${temporary ? 'temp' : 'mail'}-${normalizeLanguage(code) || 'en'}.webmanifest`
}

const mailDescriptions = {
    zh: '邮箱收件、发信与账号管理。',
    en: 'Email inbox, sending and account management.',
    es: 'Bandeja de entrada, envío de correos y gestión de cuentas.',
    fr: 'Messagerie, envoi d’e-mails et gestion des comptes.',
    ja: 'メールの受信、送信、アカウント管理。',
    ko: '메일 수신, 발송 및 계정 관리.',
    de: 'E-Mails empfangen und senden sowie Konten verwalten.',
    pt: 'Receba e envie e-mails e gerencie suas contas.',
    ru: 'Получение и отправка писем, управление учётными записями.',
    it: 'Ricevi e invia e-mail e gestisci gli account.',
    id: 'Terima dan kirim email serta kelola akun.',
    vi: 'Nhận và gửi email, quản lý tài khoản.',
    tr: 'E-posta alıp gönderin ve hesapları yönetin.',
    ar: 'استقبال الرسائل وإرسالها وإدارة الحسابات.',
    hi: 'ईमेल प्राप्त करें, भेजें और खातों का प्रबंधन करें।',
    'zh-Hant': '信箱收件、發信與帳號管理。',
}

export function mailDescription(code) {
    const language = normalizeLanguage(code) || 'en'
    return mailDescriptions[language] || mailDescriptions.en
}
