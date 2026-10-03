<template>
  <el-config-provider :locale="elementLocale">
    <router-view />
  </el-config-provider>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import {useSettingStore} from "@/store/setting.js";
import {getBrowserLanguage, resolveLanguage} from "@/i18n/index.js";
import en from 'element-plus/es/locale/lang/en';
import es from 'element-plus/es/locale/lang/es';
import fr from 'element-plus/es/locale/lang/fr';
import ja from 'element-plus/es/locale/lang/ja';
import ko from 'element-plus/es/locale/lang/ko';
import de from 'element-plus/es/locale/lang/de';
import pt from 'element-plus/es/locale/lang/pt-br';
import ru from 'element-plus/es/locale/lang/ru';
import {setExtend} from '@/utils/day.js';
const settingStore = useSettingStore()
const route = useRoute()
const browserLang = getBrowserLanguage()
const effectiveLang = computed(() => route.name === 'find'
  ? resolveLanguage(settingStore.publicMailboxLanguage, browserLang)
  : resolveLanguage(settingStore.lang, browserLang))
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import('@/icons/index.js')
const elementLocales = {zh: zhCn, en, es, fr, ja, ko, de, pt, ru}
const elementLocale = computed(() => elementLocales[effectiveLang.value] || en)
const { locale } = useI18n()
watch(effectiveLang, lang => {
  locale.value = lang
  document.documentElement.lang = lang
  setExtend(lang)
}, { immediate: true })
</script>
