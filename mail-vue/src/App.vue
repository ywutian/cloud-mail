<template>
  <el-config-provider :locale="elementLocale">
    <main v-if="startupFailed" class="app-connect-error" role="alert">
      <img src="/app-icon-192.png" alt="" width="72" height="72" />
      <h1>{{ $t('pwa.connectTitle') }}</h1>
      <p>{{ $t('pwa.connectBody') }}</p>
      <button type="button" @click="retryConnection">{{ $t('pwa.retry') }}</button>
    </main>
    <router-view v-else />
    <div v-if="!startupFailed && (!online || updateAvailable)" class="app-status" role="status">
      <span>{{ !online ? $t('pwa.offlineNotice') : $t('pwa.updateReady') }}</span>
      <button v-if="online && updateAvailable" type="button" @click="applyUpdate">{{ $t('pwa.updateNow') }}</button>
      <button v-if="online && updateAvailable" type="button" @click="dismissUpdate">{{ $t('pwa.updateLater') }}</button>
    </div>
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
import {startupFailed, online, updateAvailable, applyUpdate, dismissUpdate} from '@/pwa/status.js';
function retryConnection() { window.location.reload() }
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
<style scoped>
.app-connect-error {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
  text-align: center;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
}
.app-connect-error img { border-radius: 16px; }
.app-connect-error h1 { font-size: 22px; }
.app-connect-error p { max-width: 420px; color: var(--el-text-color-secondary); line-height: 1.6; }
.app-connect-error button, .app-status button {
  border-radius: 8px;
  background: var(--el-color-primary);
  color: #fff;
  cursor: pointer;
  padding: 9px 15px;
}
.app-connect-error button:focus-visible, .app-status button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
.app-status {
  position: fixed;
  z-index: 3000;
  bottom: calc(16px + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(640px, calc(100vw - 24px));
  padding: 12px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  box-shadow: var(--el-box-shadow);
  line-height: 1.4;
}
.app-status button:last-child { background: transparent; color: var(--el-text-color-regular); }
@media (max-width: 520px) { .app-status { width: calc(100vw - 24px); flex-wrap: wrap; } }
</style>
