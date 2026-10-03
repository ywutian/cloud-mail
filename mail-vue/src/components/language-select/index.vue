<template>
  <div class="language-picker">
    <Icon icon="mdi:translate" width="18" height="18" aria-hidden="true" />
    <select :value="modelValue || 'auto'" :aria-label="t('language')" @change="emit('update:modelValue', $event.target.value)">
      <option value="auto">{{ t('languageAuto') }} · {{ browserLanguageName }}</option>
      <option v-for="language in languages" :key="language.code" :value="language.code">
        {{ language.name }}
      </option>
    </select>
    <Icon icon="mingcute:down-small-fill" width="16" height="16" aria-hidden="true" />
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {Icon} from '@iconify/vue'
import {useI18n} from 'vue-i18n'
import {languages, getBrowserLanguage} from '@/i18n/languages.js'

defineProps({modelValue: {type: String, default: 'auto'}})
const emit = defineEmits(['update:modelValue'])
const {t} = useI18n()
const browserLanguage = ref(getBrowserLanguage())
const browserLanguageName = computed(() => languages.find(language => language.code === browserLanguage.value)?.name || 'English')

function refreshBrowserLanguage() {
  browserLanguage.value = getBrowserLanguage()
}

function onVisibilityChange() {
  if (!document.hidden) refreshBrowserLanguage()
}

onMounted(() => {
  window.addEventListener('languagechange', refreshBrowserLanguage)
  window.addEventListener('focus', refreshBrowserLanguage)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('languagechange', refreshBrowserLanguage)
  window.removeEventListener('focus', refreshBrowserLanguage)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.language-picker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  min-width: 0;
  max-width: 100%;
  padding: 0 10px;
  border: 1px solid var(--language-control-border, var(--el-border-color));
  border-radius: 9px;
  background: var(--language-control-bg, var(--el-fill-color-blank));
  color: var(--language-control-text, var(--el-text-color-primary));
}

.language-picker:focus-within {
  outline: 2px solid var(--el-color-primary, #3b82f6);
  outline-offset: 2px;
}

.language-picker select {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 180px;
  height: 42px;
  border: 0;
  outline: 0;
  appearance: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.language-picker option {
  color: #17202b;
  background: #fff;
}

@media (max-width: 480px) {
  .language-picker { flex: 1 1 auto; }
  .language-picker select { width: 100%; }
}
</style>
