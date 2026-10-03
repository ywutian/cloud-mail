import {useUserStore} from "@/store/user.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import router from "@/router";
import {websiteConfig} from "@/request/setting.js";
import i18n, {getBrowserLanguage, loadLanguage, resolveLanguage} from "@/i18n/index.js";
import {intlLanguage, languageDirection, manifestPath} from '@/i18n/languages.js'
import {loadElementLocale} from '@/ui/element-locale.js'

export async function init() {
    document.title = '\u200B'

    const settingStore = useSettingStore();
    const userStore = useUserStore();
    const accountStore = useAccountStore();

    const token = localStorage.getItem('token');
    if (!settingStore.lang) settingStore.lang = 'auto'
    const publicPage = window.location.hostname.startsWith('temp.') || window.location.pathname === '/find'
    const initialLanguage = resolveLanguage(
        publicPage ? settingStore.publicMailboxLanguage : settingStore.lang,
        getBrowserLanguage(),
    )
    let loadedLanguage = initialLanguage
    try {
        await Promise.all([loadLanguage(initialLanguage), loadElementLocale(initialLanguage)])
    } catch {
        loadedLanguage = 'en'
    }
    i18n.global.locale.value = loadedLanguage
    document.documentElement.lang = intlLanguage(loadedLanguage)
    document.documentElement.dir = languageDirection(loadedLanguage)
    document.querySelector('link[rel="manifest"]')?.setAttribute('href', manifestPath(loadedLanguage, publicPage))

    if (publicPage) {
        document.title = i18n.global.t('temporaryInbox.title')
        return
    }

    let setting = null;

    if (token) {
        const userPromise = loginUserInfo().catch(e => {
            console.error(e);
            return null;
        });

        const [s, user] = await Promise.all([websiteConfig({timeout: 12000, noMsg: true}), userPromise]);
        setting = s;
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList;
        document.title = setting.title;

        if (user) {
            accountStore.currentAccountId = user.account.accountId;
            accountStore.currentAccount = user.account;
            userStore.user = user;

            const routers = permsToRouter(user.permKeys);
            routers.forEach(routerData => {
                router.addRoute('layout', routerData);
            });
        }

    } else {
        setting = await websiteConfig({timeout: 12000, noMsg: true});
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList;
        document.title = setting.title;
    }
}
