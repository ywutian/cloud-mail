<template>
  <el-config-provider :locale="effectiveLang === 'zh' ? zhCn : null">
    <router-view />
  </el-config-provider>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import {useSettingStore} from "@/store/setting.js";
import {getBrowserLanguage, resolvePublicMailboxLanguage} from "@/i18n/index.js";
const settingStore = useSettingStore()
const route = useRoute()
const browserLang = getBrowserLanguage()
const effectiveLang = computed(() => route.name === 'find'
  ? resolvePublicMailboxLanguage(settingStore.publicMailboxLanguage, browserLang)
  : settingStore.lang)
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import('@/icons/index.js')
const { locale } = useI18n()
watch(effectiveLang, lang => {
  locale.value = lang
  document.documentElement.lang = lang
}, { immediate: true })
</script>
