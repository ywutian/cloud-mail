export const languages = [
    {code: 'zh', name: '简体中文', intl: 'zh-CN'},
    {code: 'en', name: 'English', intl: 'en-US'},
    {code: 'es', name: 'Español', intl: 'es-ES'},
    {code: 'fr', name: 'Français', intl: 'fr-FR'},
    {code: 'ja', name: '日本語', intl: 'ja-JP'},
    {code: 'ko', name: '한국어', intl: 'ko-KR'},
    {code: 'de', name: 'Deutsch', intl: 'de-DE'},
    {code: 'pt', name: 'Português (Brasil)', intl: 'pt-BR'},
    {code: 'ru', name: 'Русский', intl: 'ru-RU'},
    {code: 'it', name: 'Italiano', intl: 'it-IT'},
    {code: 'id', name: 'Bahasa Indonesia', intl: 'id-ID'},
    {code: 'vi', name: 'Tiếng Việt', intl: 'vi-VN'},
    {code: 'tr', name: 'Türkçe', intl: 'tr-TR'},
    {code: 'ar', name: 'العربية', intl: 'ar-SA'},
    {code: 'hi', name: 'हिन्दी', intl: 'hi-IN'},
]

const supported = new Set(languages.map(({code}) => code))

export function normalizeLanguage(value) {
    if (typeof value !== 'string') return null
    const parts = value.toLowerCase().replaceAll('_', '-').split('-')
    const code = parts[0]
    // Only simplified Chinese and Brazilian Portuguese have translations.
    // Skip unsupported variants so the next browser preference can be used.
    if (code === 'zh' && parts.some(part => ['hant', 'tw', 'hk', 'mo'].includes(part))) return null
    if (code === 'pt' && parts.includes('pt', 1)) return null
    return supported.has(code) ? code : null
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
    return normalizeLanguage(selection) || browserLanguage
}

export function intlLanguage(code) {
    return languages.find(language => language.code === code)?.intl || 'en-US'
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
}

export function mailDescription(code) {
    return mailDescriptions[normalizeLanguage(code) || 'en']
}
