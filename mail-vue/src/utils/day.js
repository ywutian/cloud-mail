import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/es'
import 'dayjs/locale/fr'
import 'dayjs/locale/ja'
import 'dayjs/locale/ko'
import 'dayjs/locale/de'
import 'dayjs/locale/pt-br'
import 'dayjs/locale/ru'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {useSettingStore} from "@/store/setting.js";
import {intlLanguage, resolveLanguage} from '@/i18n/languages.js'
dayjs.extend(utc)
dayjs.extend(timezone)
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dayjsLanguages = {zh: 'zh-cn', pt: 'pt-br'}

function currentLanguage() {
    return resolveLanguage(useSettingStore().lang)
}

export function fromNow(date) {
    const d = dayjs.utc(date).tz(timeZone);
    const now = dayjs();
    const locale = intlLanguage(currentLanguage());
    const relative = new Intl.RelativeTimeFormat(locale, {numeric: 'auto', style: 'short'});
    const seconds = Math.max(0, now.diff(d, 'second'));
    if (seconds < 60) return relative.format(0, 'second');
    if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), 'minute');
    if (seconds < 7200) return relative.format(-Math.floor(seconds / 3600), 'hour');
    if (now.isSame(d, 'day')) {
        return new Intl.DateTimeFormat(locale, {hour: 'numeric', minute: '2-digit'}).format(d.toDate());
    }
    return new Intl.DateTimeFormat(locale, {
        month: 'short', day: 'numeric',
        ...(now.year() === d.year() ? {} : {year: 'numeric'}),
    }).format(d.toDate());
}

export function updateNow(date) {
    return fromNow(date)
}

export function formatDetailDate(time, lang = currentLanguage()) {
    const d = dayjs.utc(time).tz(timeZone);
    const now = dayjs();
    return new Intl.DateTimeFormat(intlLanguage(lang), {
        weekday: 'short', month: 'short', day: 'numeric',
        ...(now.year() === d.year() ? {} : {year: 'numeric'}),
        hour: 'numeric', minute: '2-digit',
    }).format(d.toDate());
}

export function tzDayjs(time) {
    return dayjs.utc(time).tz(timeZone)
}

export function toUtc(time) {
    return dayjs(time).utc()
}

export function setExtend(lang) {
    dayjs.locale(dayjsLanguages[lang] || lang)
}
