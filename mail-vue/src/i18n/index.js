import { createI18n } from 'vue-i18n';
import en from './en.js'
import zh from './zh.js'
import es from './es.js'
import fr from './fr.js'
import ja from './ja.js'
import ko from './ko.js'
import de from './de.js'
import pt from './pt.js'
import ru from './ru.js'
export {getBrowserLanguage, resolveLanguage} from './languages.js'
const i18n = createI18n({
    legacy: false,
    fallbackLocale: 'en',
    messages: {
        zh,
        en,
        es,
        fr,
        ja,
        ko,
        de,
        pt,
        ru,
    },
});

export default i18n;
