<template>
  <div class="tm">
    <div class="tm-shell">

      <header class="tm-head">
        <div class="tm-brand">
          <Icon icon="fluent:mail-24-filled" width="20" height="20"/>
          <span>{{ t('temporaryInbox.title') }}</span>
        </div>
        <p class="tm-tagline">{{ t('temporaryInbox.tagline') }}</p>
      </header>

      <section class="tm-card">
        <div class="tm-card-label">{{ t('temporaryInbox.yourAddress') }}</div>

        <div class="tm-addr" @click="copyAddr">
          <span v-if="address">{{ address }}</span>
          <span v-else class="tm-addr-skeleton"></span>
        </div>

        <div class="tm-actions">
          <button class="tm-btn tm-btn-primary" :disabled="!address" @click="copyAddr">
            <Icon :icon="copied ? 'fluent:checkmark-24-filled' : 'fluent:copy-24-regular'" width="17" height="17"/>
            {{ copied ? t('temporaryInbox.copied') : t('temporaryInbox.copyAddress') }}
          </button>
          <button class="tm-btn" :disabled="!address" @click="copyAccessLink">{{ t('temporaryInbox.copyLink') }}</button>
          <button class="tm-btn" :disabled="creating" @click="genAddr">
            <Icon icon="mingcute:refresh-2-line" width="17" height="17"/>
            {{ t('temporaryInbox.newAddress') }}
          </button>
          <div class="tm-timer">
            <span class="tm-pulse" :class="loading ? 'is-busy' : ''"></span>
            {{ loading ? t('temporaryInbox.checking') : t('temporaryInbox.refreshIn', { seconds: countdown }) }}
          </div>
        </div>
        <p class="tm-access-note">{{ t('temporaryInbox.accessNote') }}</p>
      </section>

      <div class="tm-manual">
        <Icon class="tm-manual-icon" icon="iconoir:search" width="16" height="16"/>
        <input v-model="manual" :placeholder="t('temporaryInbox.searchPlaceholder')" spellcheck="false"
               @keyup.enter="useManual"/>
        <button class="tm-btn tm-btn-slim" @click="useManual">{{ t('temporaryInbox.search') }}</button>
      </div>

      <section class="tm-inbox">
        <div class="tm-inbox-head">
          <span>{{ t('temporaryInbox.inbox') }}</span>
          <span class="tm-inbox-count">{{ mails.length ? (mails.length === 1 ? t('temporaryInbox.oneEmail') : t('temporaryInbox.emailCount', { count: mails.length })) : '' }}</span>
        </div>

        <transition-group name="tm-fade" tag="div">
          <article v-for="m in mails" :key="m.emailId" class="tm-mail" @click="openMail(m)">
            <div class="tm-mail-body">
              <div class="tm-mail-from">{{ m.sendName || m.sendEmail }}</div>
              <div class="tm-mail-subject">{{ m.subject || t('temporaryInbox.noSubject') }}</div>
            </div>
            <button v-if="m.code" class="tm-code" :title="t('temporaryInbox.clickToCopy')" @click.stop="copyCode(m.code)">
              {{ m.code }}
            </button>
            <time class="tm-mail-time">{{ fmt(m.createTime) }}</time>
            <Icon class="tm-mail-arrow" icon="mingcute:right-line" width="17" height="17"/>
          </article>
        </transition-group>

        <div v-if="!mails.length" class="tm-empty">
          <Icon icon="fluent:mail-inbox-24-regular" width="34" height="34"/>
          <p>{{ inboxError ? t(inboxError) : (searched ? t('temporaryInbox.noRecentMail') : t('temporaryInbox.waitingForMail')) }}</p>
        </div>
      </section>

      <p class="tm-foot">{{ t('temporaryInbox.retention') }}</p>
    </div>

    <div v-if="viewing" class="tm-modal" @click.self="closeMail">
      <div class="tm-view">
        <header class="tm-view-head">
          <div class="tm-view-meta">
            <div class="tm-view-subject">{{ viewing.subject || t('temporaryInbox.noSubject') }}</div>
          </div>
          <button class="tm-view-close" :title="t('temporaryInbox.close')" @click="closeMail">
            <Icon icon="mingcute:close-line" width="18" height="18"/>
          </button>
        </header>

        <div class="tm-view-info">
          <div class="tm-view-info-row">
            <span class="tm-view-info-label">{{ t('temporaryInbox.sender') }}</span>
            <span class="tm-view-name">{{ viewing.sendName || viewing.sendEmail }}</span>
            <span v-if="viewing.sendName && viewing.sendEmail" class="tm-view-addr">&lt;{{ viewing.sendEmail }}&gt;</span>
          </div>
          <div class="tm-view-info-row">
            <span class="tm-view-info-label">{{ t('temporaryInbox.recipient') }}</span>
            <span>{{ formatRecipients(viewing) }}</span>
          </div>
          <time class="tm-view-date">{{ formatDetailDate(viewing.createTime, browserLang) }}</time>
          <el-alert v-if="viewing.status === 3" :closable="false" :title="statusMessage(viewing.message)"
                    type="error" show-icon/>
          <el-alert v-if="viewing.status === 4" :closable="false" :title="$t('complained')"
                    type="warning" show-icon/>
          <el-alert v-if="viewing.status === 5" :closable="false" :title="$t('delayed')"
                    type="warning" show-icon/>
        </div>

        <div v-if="viewing.code" class="tm-view-code">
          <span class="tm-view-code-label">{{ t('temporaryInbox.verificationCode') }}</span>
          <button class="tm-code" :title="t('temporaryInbox.clickToCopy')" @click="copyCode(viewing.code)">
            {{ viewing.code }}
          </button>
          <span class="tm-view-code-hint">{{ copied ? t('temporaryInbox.copied') : t('temporaryInbox.clickToCopy') }}</span>
        </div>

        <div class="tm-view-stage">
          <div v-if="viewLoading" class="tm-view-loading">{{ t('temporaryInbox.opening') }}</div>
          <iframe v-else class="tm-view-frame" :title="t('temporaryInbox.emailContent')"
                  :style="{height: frameHeight}" :srcdoc="viewHtml"
                  referrerpolicy="no-referrer"
                  sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>
          <section v-if="!viewLoading && viewing.attList?.length" class="tm-attachments">
            <div class="tm-attachments-title">
              <span>{{ t('temporaryInbox.attachments') }}</span>
              <span>{{ viewing.attList.length === 1 ? t('temporaryInbox.oneAttachment') : t('temporaryInbox.attachmentCount', { count: viewing.attList.length }) }}</span>
            </div>
            <div v-for="att in viewing.attList" :key="att.attId" class="tm-attachment">
              <div class="tm-attachment-icon" :class="{ 'is-previewable': isImage(att.filename) }" @click="showImage(att)">
                <Icon v-bind="getIconByName(att.filename)"/>
              </div>
              <div class="tm-attachment-name" :class="{ 'is-previewable': isImage(att.filename) }"
                   :title="att.filename" @click="showImage(att)">{{ att.filename }}</div>
              <div class="tm-attachment-size">{{ formatBytes(att.size) }}</div>
              <div class="tm-attachment-actions">
                <button v-if="isImage(att.filename)" type="button" :title="t('temporaryInbox.preview')" @click="showImage(att)">
                  <Icon icon="hugeicons:view" width="22" height="22"/>
                </button>
                <button type="button" :title="t('temporaryInbox.download')" @click="downloadAttachment(att)">
                  <Icon icon="system-uicons:push-down" width="22" height="22"/>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
    <el-image-viewer v-if="showPreview" :url-list="srcList" show-progress @close="closePreview"/>
  </div>
</template>

<script setup>
import {computed, defineOptions, onMounted, onUnmounted, ref} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {useSettingStore} from "@/store/setting.js";
import {getBrowserLanguage} from "@/i18n/index.js";
import {openCreateInbox, openDomains, openMailContent, openRecentMails} from "@/request/open.js";
import {getExtName, formatBytes} from "@/utils/file-utils.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {formatDetailDate, setExtend} from "@/utils/day.js";

defineOptions({
  name: 'find'
})

const REFRESH_SEC = 8
const ADDR_KEY = 'findAddress'
const {t} = useI18n()
const settingStore = useSettingStore()
const browserLang = getBrowserLanguage()

const address = ref('')
const manual = ref('')
const creating = ref(false)
const mails = ref([])
const loading = ref(false)
const searched = ref(false)
const inboxError = ref('')
const copied = ref(false)
const countdown = ref(REFRESH_SEC)
const domains = ref([])

const viewing = ref(null)
const viewLoading = ref(false)
const viewError = ref(false)
const showPreview = ref(false)
const srcList = ref([])

let timer = null
let copyTimer = null
let inboxRequestId = 0
let viewRequestId = 0
let previewRequestId = 0
const previewUrls = new Set()

// 邮件 HTML 在受限 iframe 内渲染，不允许脚本和同源访问。
const viewHtml = computed(() => {
  if (!viewing.value) return ''
  const raw = (!viewError.value && viewing.value.content?.replace(
      /\{\{domain\}\}(attachments\/[A-Za-z0-9._-]+)/g,
      (_, key) => viewing.value.inlineMedia?.[key] || ''
  ).replace(/\{\{domain\}\}/g, ''))
      || `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(viewError.value ? t('temporaryInbox.mailExpired') : viewing.value.text || t('temporaryInbox.emptyMail'))}</pre>`
  return `<!doctype html><meta charset="utf-8">`
      + `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${window.location.origin} data: blob:; style-src 'unsafe-inline'">`
      + `<meta name="referrer" content="no-referrer">`
      + `<base target="_blank">`
      + `<style>body{margin:0;padding:18px;background:#fff;color:#1a1a1a;`
      + `font:14px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;`
      + `word-break:break-word}`
      + `img{max-width:100%;height:auto}a{color:#2563eb}`
      + `table{max-width:100%}</style>`
      + raw
})

// sandbox 里不能跑脚本，iframe 拿不到内容高度，只能按正文长度粗估一下。
// 好处是验证码邮件（通常很短）不会撑出一大片空白。
const frameHeight = computed(() => {
  const len = (viewing.value?.content || viewing.value?.text || '').length
  if (len < 800) return '260px'
  if (len < 4000) return '420px'
  return '62vh'
})

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
      ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]))
}

function formatRecipients(mail) {
  try {
    const recipient = JSON.parse(mail.recipient || '[]')
    if (Array.isArray(recipient)) {
      const addresses = recipient.map(item => item?.address).filter(Boolean)
      if (addresses.length) return addresses.join(', ')
    }
  } catch { /* 旧邮件可能没有标准收件人结构 */ }
  return mail.toEmail || address.value
}

function statusMessage(message) {
  if (!message) return ''
  try { return JSON.parse(message).message || '' } catch { return String(message) }
}

function attachmentUrl(att, download = false) {
  const params = new URLSearchParams({
    emailId: String(viewing.value.emailId),
    address: address.value,
    attId: String(att.attId)
  })
  if (download) params.set('download', '1')
  return `${import.meta.env.VITE_BASE_URL.replace(/\/$/, '')}/open/attachment?${params}`
}

async function attachmentBlob(att) {
  const response = await fetch(attachmentUrl(att), {
    cache: 'no-store'
  })
  if (!response.ok) throw new Error(t('temporaryInbox.attachmentUnavailable'))
  return response.blob()
}

async function downloadAttachment(att) {
  try {
    const blob = await attachmentBlob(att)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = att.filename || 'attachment'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  } catch {
    flash(t('temporaryInbox.attachmentUnavailable'))
  }
}

function isImage(filename) {
  return ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'jfif'].includes(getExtName(filename))
}

function closePreview() {
  previewRequestId += 1
  showPreview.value = false
  srcList.value = []
  for (const url of previewUrls) URL.revokeObjectURL(url)
  previewUrls.clear()
}

async function showImage(att) {
  if (!isImage(att.filename)) return
  closePreview()
  const requestId = previewRequestId
  try {
    const blob = await attachmentBlob(att)
    if (requestId !== previewRequestId || !viewing.value) return
    const url = URL.createObjectURL(blob)
    previewUrls.add(url)
    srcList.value = [url]
    showPreview.value = true
  } catch {
    flash(t('temporaryInbox.imageUnavailable'))
  }
}

async function openMail(m) {
  const requestId = ++viewRequestId
  const requestedAddress = address.value
  closePreview()
  viewing.value = m
  viewLoading.value = true
  viewError.value = false
  try {
    const full = await openMailContent(m.emailId, requestedAddress)
    if (requestId === viewRequestId && viewing.value?.emailId === m.emailId && address.value === requestedAddress) {
      viewing.value = full
    }
  } catch {
    if (requestId === viewRequestId && viewing.value?.emailId === m.emailId) {
      viewError.value = true
    }
  } finally {
    if (requestId === viewRequestId) viewLoading.value = false
  }
}

function closeMail() {
  viewRequestId += 1
  closePreview()
  viewing.value = null
  viewError.value = false
}

function onEsc(e) {
  if (e.key !== 'Escape') return
  if (showPreview.value) {
    closePreview()
  } else if (viewing.value) {
    closeMail()
  }
}

onMounted(async () => {
  setExtend(browserLang === 'en' ? 'en' : 'zh-cn')
  try {
    domains.value = await openDomains() || []
  } catch { /* 拿不到域名就只能手动输入地址 */ }

  let saved = null
  try {
    saved = localStorage.getItem(ADDR_KEY)
    if (!saved) saved = JSON.parse(localStorage.getItem('findInbox') || 'null')?.address
  } catch { /* 隐私模式读不到 */ }

  const fragment = new URLSearchParams(window.location.hash.slice(1))
  const sharedAddress = fragment.get('address')
  if (sharedAddress) {
    saved = sharedAddress
    window.history.replaceState({}, '', window.location.pathname + window.location.search)
  }

  if (saved && domains.value.some(d => saved.toLowerCase().endsWith('@' + d.toLowerCase()))) {
    address.value = saved.toLowerCase()
    saveInbox()
    load()
  } else {
    await genAddr()
  }

  window.addEventListener('keydown', onEsc)
  // 一个定时器同时管倒计时和触发刷新，比两个各跑各的干净
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      countdown.value = REFRESH_SEC
      load()
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (copyTimer) clearTimeout(copyTimer)
  window.removeEventListener('keydown', onEsc)
  closePreview()
  setExtend(settingStore.lang === 'en' ? 'en' : 'zh-cn')
})

function saveInbox() {
  try {
    localStorage.setItem(ADDR_KEY, address.value)
    localStorage.removeItem('findInbox')
  } catch { /* 存不下就算了 */ }
}

async function genAddr() {
  if (creating.value) return
  creating.value = true
  try {
    const inbox = await openCreateInbox()
    address.value = inbox.address
    saveInbox()
    resetInbox()
  } catch {
    flash(t('temporaryInbox.createFailed'))
  } finally {
    creating.value = false
  }
}

function resetInbox() {
  closeMail()
  inboxRequestId += 1
  loading.value = false
  mails.value = []
  searched.value = false
  inboxError.value = ''
  countdown.value = REFRESH_SEC
  load()
}

async function load() {
  if (!address.value || loading.value) return
  const requestId = ++inboxRequestId
  const requestedAddress = address.value
  loading.value = true
  try {
    const result = await openRecentMails(requestedAddress)
    if (requestId === inboxRequestId && address.value === requestedAddress) {
      mails.value = result || []
      searched.value = true
      inboxError.value = ''
    }
  } catch (error) {
    if (requestId === inboxRequestId && error?.code === 403) {
      inboxError.value = 'temporaryInbox.registeredAddress'
    }
  } finally {
    if (requestId === inboxRequestId) loading.value = false
  }
}

async function useManual() {
  const addr = manual.value.trim().toLowerCase()
  if (!addr) return
  if (!domains.value.some(d => addr.endsWith('@' + d))) {
    flash(t('temporaryInbox.ownDomainOnly'))
    return
  }
  try {
    await openRecentMails(addr)
  } catch {
    flash(t('temporaryInbox.invalidAddress'))
    return
  }
  address.value = addr
  saveInbox()
  resetInbox()
}

async function copyAddr() {
  if (!address.value) return
  await copy(address.value)
}

async function copyAccessLink() {
  if (!address.value) return
  const fragment = new URLSearchParams({address: address.value})
  await copy(`${window.location.origin}/find#${fragment}`)
}

async function copyCode(code) {
  await copy(code)
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 1600)
  } catch {
    flash(t('temporaryInbox.copyFailed'))
  }
}

function flash(msg) {
  // 这页面是给陌生人用的，不引 Element 的全局弹窗，原生提示够了
  alert(msg)
}

function fmt(t) {
  return t ? String(t).slice(11, 16) : ''
}
</script>

<style scoped>
.tm {
  --bg: #0a0e14;
  --card: #141b24;
  --card-2: #1b232e;
  --line: #232d3a;
  --ink: #e9eef4;
  --ink-2: #93a1b2;
  --ink-3: #5f6d7e;
  --accent: #3b82f6;
  --accent-ink: #ffffff;
  --good: #34d399;
  --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;

  min-height: 100vh;
  padding: 56px 18px 40px;
  background:
      radial-gradient(1000px 420px at 50% -180px, #172236 0%, transparent 70%),
      var(--bg);
  color: var(--ink);
  font-feature-settings: "tnum";
}

.tm-shell {
  max-width: 620px;
  margin: 0 auto;
}

/* ---------- header ---------- */

.tm-head {
  text-align: center;
  margin-bottom: 30px;
}

.tm-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -.01em;
  color: var(--ink);
}

.tm-brand svg {
  color: var(--accent);
}

.tm-tagline {
  margin: 9px 0 0;
  font-size: 13.5px;
  color: var(--ink-2);
}

/* ---------- address card ---------- */

.tm-card {
  padding: 22px 22px 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--card-2), var(--card));
}

.tm-card-label {
  font-size: 10.5px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.tm-addr {
  margin: 12px 0 18px;
  font-family: var(--mono);
  font-size: 25px;
  font-weight: 600;
  letter-spacing: -.01em;
  word-break: break-all;
  cursor: pointer;
  color: var(--ink);
}

.tm-addr-skeleton {
  display: block;
  width: 62%;
  height: 26px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--card-2), var(--line), var(--card-2));
  background-size: 200% 100%;
  animation: tm-shimmer 1.3s linear infinite;
}

@keyframes tm-shimmer {
  to { background-position: -200% 0; }
}

.tm-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}

.tm-access-note {
  margin: 13px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-3);
}

/* ---------- buttons ---------- */

.tm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 15px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--card-2);
  color: var(--ink-2);
  font-size: 13.5px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color .15s, color .15s, background .15s;
}

.tm-btn:hover:not(:disabled) {
  border-color: var(--ink-3);
  color: var(--ink);
}

.tm-btn:disabled {
  opacity: .45;
  cursor: default;
}

.tm-btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
  font-weight: 500;
}

.tm-btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
  border-color: var(--accent);
  color: var(--accent-ink);
}

.tm-btn-slim {
  padding: 8px 13px;
}

/* ---------- refresh timer ---------- */

.tm-timer {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  font-size: 12.5px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.tm-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--good);
}

.tm-pulse.is-busy {
  background: var(--accent);
  animation: tm-blink .8s ease-in-out infinite;
}

@keyframes tm-blink {
  50% { opacity: .25; }
}

@media (prefers-reduced-motion: reduce) {
  .tm-pulse.is-busy,
  .tm-addr-skeleton { animation: none; }
}

/* ---------- manual search ---------- */

.tm-manual {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  margin: 16px 0 22px;
  padding: 5px 5px 5px 13px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--card);
}

.tm-manual input:first-of-type {
  grid-column: 2;
}

.tm-manual input:nth-of-type(2) {
  grid-column: 2;
  grid-row: 2;
  border-top: 1px solid var(--line);
}

.tm-manual button {
  grid-column: 3;
  grid-row: 1 / 3;
}

.tm-manual-icon {
  color: var(--ink-3);
  flex-shrink: 0;
}

.tm-manual input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-size: 13.5px;
  font-family: inherit;
  padding: 6px 0;
}

.tm-manual input::placeholder {
  color: var(--ink-3);
}

.tm-manual:focus-within {
  border-color: var(--accent);
}

/* ---------- inbox ---------- */

.tm-inbox {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  overflow: hidden;
}

.tm-inbox-head {
  display: flex;
  justify-content: space-between;
  padding: 13px 18px;
  border-bottom: 1px solid var(--line);
  font-size: 10.5px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.tm-inbox-count {
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}

.tm-mail {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 18px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background .15s;
}

.tm-mail:hover {
  background: var(--card-2);
}

.tm-mail-arrow {
  flex-shrink: 0;
  color: var(--ink-3);
}

.tm-mail:last-child {
  border-bottom: none;
}

.tm-mail-body {
  flex: 1;
  min-width: 0;
}

.tm-mail-from {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tm-mail-subject {
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tm-code {
  flex-shrink: 0;
  padding: 7px 13px;
  border: 1px solid rgba(59, 130, 246, .35);
  border-radius: 8px;
  background: rgba(59, 130, 246, .12);
  color: #7cb0fb;
  font-family: var(--mono);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: .09em;
  cursor: pointer;
  transition: background .15s;
}

.tm-code:hover {
  background: rgba(59, 130, 246, .22);
}

.tm-mail-time {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.tm-empty {
  padding: 54px 18px;
  text-align: center;
  color: var(--ink-3);
}

.tm-empty p {
  margin: 10px 0 0;
  font-size: 13px;
}

.tm-fade-enter-active {
  transition: opacity .28s ease, transform .28s ease;
}

.tm-fade-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.tm-foot {
  margin: 18px 0 0;
  text-align: center;
  font-size: 12px;
  color: var(--ink-3);
}

/* ---------- 正文弹窗 ---------- */

.tm-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(4, 7, 11, .78);
  backdrop-filter: blur(3px);
}

.tm-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
  max-height: 88vh;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--card);
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, .45);
}

.tm-view-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px 16px;
}

.tm-view-meta {
  flex: 1;
  min-width: 0;
}

.tm-view-subject {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--ink);
}

.tm-view-info {
  padding: 0 20px 14px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
  color: var(--ink-2);
}

.tm-view-info-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  overflow-wrap: anywhere;
}

.tm-view-info-label {
  flex-shrink: 0;
  min-width: 48px;
  font-weight: 600;
  color: var(--ink);
}

.tm-view-name {
  font-weight: 500;
}

.tm-view-addr,
.tm-view-date {
  color: var(--ink-3);
}

.tm-view-date {
  display: block;
  margin: 4px 0 0 54px;
  font-variant-numeric: tabular-nums;
}

.tm-view-info :deep(.el-alert) {
  margin-top: 12px;
}

.tm-view-close {
  flex-shrink: 0;
  display: inline-flex;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--card-2);
  color: var(--ink-2);
  cursor: pointer;
  transition: color .15s, border-color .15s;
}

.tm-view-close:hover {
  color: var(--ink);
  border-color: var(--ink-3);
}

/* 验证码单独一条，不跟标题挤在一起 */
.tm-view-code {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 20px 4px;
  padding: 12px 14px;
  border: 1px solid rgba(59, 130, 246, .25);
  border-radius: 10px;
  background: rgba(59, 130, 246, .08);
}

.tm-view-code-label {
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.tm-view-code-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--ink-3);
}

/* 白底正文浮在深色衬底上，像一张信纸，不是硬切一刀 */
.tm-view-stage {
  min-height: 0;
  padding: 16px 20px 20px;
  overflow: auto;
}

.tm-view-frame {
  display: block;
  width: 100%;
  border: none;
  border-radius: 10px;
  background: #fff;
}

.tm-view-loading {
  padding: 60px 18px;
  text-align: center;
  font-size: 13px;
  color: var(--ink-3);
}

.tm-attachments {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--ink);
}

.tm-attachments-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
}

.tm-attachments-title span:first-child {
  font-weight: 600;
}

.tm-attachments-title span:last-child {
  color: var(--ink-2);
}

.tm-attachment {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-top: 10px;
  padding: 7px;
  border-radius: 5px;
  background: var(--card-2);
  font-size: 13px;
}

.tm-attachment-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tm-attachment-size {
  color: var(--ink-3);
  font-size: 12px;
}

.tm-attachment-icon {
  display: grid;
  place-items: center;
}

.tm-attachment .is-previewable {
  cursor: pointer;
}

.tm-attachment-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 4px;
}

.tm-attachment-actions button,
.tm-attachment-actions a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink-2);
  cursor: pointer;
}

.tm-attachment-actions button:hover,
.tm-attachment-actions a:hover {
  color: var(--ink);
}

/* ---------- mobile ---------- */

@media (max-width: 560px) {
  .tm {
    padding: 34px 13px 30px;
  }

  .tm-addr {
    font-size: 18px;
  }

  .tm-timer {
    width: 100%;
    margin-left: 0;
    order: 3;
  }

  .tm-code {
    font-size: 16px;
    padding: 6px 10px;
  }

  /* 手机上弹窗贴边铺满，别再留一圈边距挤内容 */
  .tm-modal {
    padding: 0;
    align-items: flex-end;
  }

  .tm-view {
    max-width: none;
    max-height: 92vh;
    border-radius: 16px 16px 0 0;
    border-bottom: none;
  }

  .tm-view-code {
    margin: 0 14px 4px;
  }

  .tm-view-stage {
    padding: 12px 14px 16px;
  }

  .tm-view-head {
    padding: 16px 14px 14px;
  }

  .tm-view-info {
    padding: 0 14px 12px;
  }
}
</style>
