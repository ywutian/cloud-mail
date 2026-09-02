<template>
  <div class="tm">
    <div class="tm-shell">

      <header class="tm-head">
        <div class="tm-brand">
          <Icon icon="fluent:mail-24-filled" width="20" height="20"/>
          <span>临时邮箱</span>
        </div>
        <p class="tm-tagline">不用注册。复制地址拿去用，验证码会自己出现在下面。</p>
      </header>

      <section class="tm-card">
        <div class="tm-card-label">你的临时地址</div>

        <div class="tm-addr" @click="copyAddr">
          <span v-if="address">{{ address }}</span>
          <span v-else class="tm-addr-skeleton"></span>
        </div>

        <div class="tm-actions">
          <button class="tm-btn tm-btn-primary" :disabled="!address" @click="copyAddr">
            <Icon :icon="copied ? 'fluent:checkmark-24-filled' : 'fluent:copy-24-regular'" width="17" height="17"/>
            {{ copied ? '已复制' : '复制地址' }}
          </button>
          <button class="tm-btn" @click="genAddr">
            <Icon icon="mingcute:refresh-2-line" width="17" height="17"/>
            换一个
          </button>
          <div class="tm-timer">
            <span class="tm-pulse" :class="loading ? 'is-busy' : ''"></span>
            {{ loading ? '查收中' : `${countdown}s 后刷新` }}
          </div>
        </div>
      </section>

      <div class="tm-manual">
        <Icon class="tm-manual-icon" icon="iconoir:search" width="16" height="16"/>
        <input v-model="manual" placeholder="查询你已经在用的地址" spellcheck="false"
               @keyup.enter="useManual"/>
        <button class="tm-btn tm-btn-slim" @click="useManual">查询</button>
      </div>

      <section class="tm-inbox">
        <div class="tm-inbox-head">
          <span>收件箱</span>
          <span class="tm-inbox-count">{{ mails.length ? `${mails.length} 封` : '' }}</span>
        </div>

        <transition-group name="tm-fade" tag="div">
          <article v-for="m in mails" :key="m.emailId" class="tm-mail" @click="openMail(m)">
            <div class="tm-mail-body">
              <div class="tm-mail-from">{{ m.sendName || m.sendEmail }}</div>
              <div class="tm-mail-subject">{{ m.subject || '(无主题)' }}</div>
            </div>
            <button v-if="m.code" class="tm-code" title="点击复制" @click.stop="copyCode(m.code)">
              {{ m.code }}
            </button>
            <time class="tm-mail-time">{{ fmt(m.createTime) }}</time>
            <Icon class="tm-mail-arrow" icon="mingcute:right-line" width="17" height="17"/>
          </article>
        </transition-group>

        <div v-if="!mails.length" class="tm-empty">
          <Icon icon="fluent:mail-inbox-24-regular" width="34" height="34"/>
          <p>{{ searched ? '最近 10 分钟没有收到邮件' : '等待邮件…' }}</p>
        </div>
      </section>

      <p class="tm-foot">邮件只保留最近 10 分钟</p>
    </div>

    <div v-if="viewing" class="tm-modal" @click.self="closeMail">
      <div class="tm-view">
        <header class="tm-view-head">
          <div class="tm-view-meta">
            <div class="tm-view-subject">{{ viewing.subject || '(无主题)' }}</div>
            <div class="tm-view-from">
              {{ viewing.sendName || viewing.sendEmail }}
              <span v-if="viewing.sendName && viewing.sendEmail" class="tm-view-addr">
                &lt;{{ viewing.sendEmail }}&gt;
              </span>
            </div>
          </div>
          <button v-if="viewing.code" class="tm-code" title="点击复制" @click="copyCode(viewing.code)">
            {{ viewing.code }}
          </button>
          <button class="tm-view-close" title="关闭" @click="closeMail">
            <Icon icon="mingcute:close-line" width="18" height="18"/>
          </button>
        </header>

        <div v-if="viewLoading" class="tm-view-loading">正在打开…</div>
        <iframe v-else class="tm-view-frame" :srcdoc="viewHtml" referrerpolicy="no-referrer"
                sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, defineOptions, onMounted, onUnmounted, ref} from "vue";
import {Icon} from "@iconify/vue";
import {openDomains, openMailContent, openRecentMails} from "@/request/open.js";

defineOptions({
  name: 'find'
})

const REFRESH_SEC = 8
const ADDR_KEY = 'findAddress'

const address = ref('')
const manual = ref('')
const mails = ref([])
const loading = ref(false)
const searched = ref(false)
const copied = ref(false)
const countdown = ref(REFRESH_SEC)
const domains = ref([])

const viewing = ref(null)
const viewLoading = ref(false)

let timer = null
let copyTimer = null

// 邮件 HTML 放进 iframe 渲染。sandbox 没给 allow-scripts，也没给 allow-same-origin：
// 脚本、内联事件、javascript: 链接一律不执行，邮件自带的 <style> 也污染不到本页。
// 所以这里不需要再引一个 sanitize 库。
const viewHtml = computed(() => {
  if (!viewing.value) return ''
  const raw = viewing.value.content
      || `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(viewing.value.text || '(空邮件)')}</pre>`
  return `<!doctype html><meta charset="utf-8">`
      + `<base target="_blank">`
      + `<style>body{margin:0;padding:18px;background:#fff;color:#1a1a1a;`
      + `font:14px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;`
      + `word-break:break-word}`
      + `img{max-width:100%;height:auto}a{color:#2563eb}`
      + `table{max-width:100%}</style>`
      + raw
})

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
      ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]))
}

async function openMail(m) {
  viewing.value = m
  viewLoading.value = true
  try {
    const full = await openMailContent(m.emailId, address.value)
    if (viewing.value && viewing.value.emailId === m.emailId) {
      viewing.value = full
    }
  } catch {
    if (viewing.value) viewing.value = {...m, text: '这封邮件打不开了，可能已经过期'}
  } finally {
    viewLoading.value = false
  }
}

function closeMail() {
  viewing.value = null
}

function onEsc(e) {
  if (e.key === 'Escape' && viewing.value) closeMail()
}

onMounted(async () => {
  try {
    domains.value = await openDomains() || []
  } catch { /* 拿不到域名就只能手动输入地址 */ }

  let saved = ''
  try {
    saved = localStorage.getItem(ADDR_KEY) || ''
  } catch { /* 隐私模式读不到 */ }

  // 地址只是个字符串：catch-all 收所有地址，所以不需要向后端注册
  if (saved && domains.value.some(d => saved.endsWith('@' + d))) {
    address.value = saved
  } else {
    genAddr()
  }

  load()
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
})

// 字符集去掉 0/1/i/l/o，念出来或手抄不会认错
function genAddr() {
  const domain = domains.value[0]
  if (!domain) return

  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  const buf = new Uint32Array(10)
  crypto.getRandomValues(buf)
  address.value = Array.from(buf, n => chars[n % chars.length]).join('') + '@' + domain

  try {
    localStorage.setItem(ADDR_KEY, address.value)
  } catch { /* 存不下就算了 */ }

  resetInbox()
}

function resetInbox() {
  mails.value = []
  searched.value = false
  countdown.value = REFRESH_SEC
  load()
}

async function load() {
  if (!address.value || loading.value) return
  loading.value = true
  try {
    mails.value = await openRecentMails(address.value) || []
    searched.value = true
  } catch {
    // 轮询失败不打扰，下一轮再试
  } finally {
    loading.value = false
  }
}

function useManual() {
  const addr = manual.value.trim().toLowerCase()
  if (!addr) return
  if (!domains.value.some(d => addr.endsWith('@' + d))) {
    flash('只能查询本站域名的地址')
    return
  }
  address.value = addr
  try {
    localStorage.setItem(ADDR_KEY, addr)
  } catch { /* 忽略 */ }
  resetInbox()
}

async function copyAddr() {
  if (!address.value) return
  await copy(address.value)
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
    flash('浏览器不允许复制，请手动选中')
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
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 16px 0 22px;
  padding: 5px 5px 5px 13px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--card);
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
  max-width: 660px;
  max-height: 84vh;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  overflow: hidden;
}

.tm-view-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
}

.tm-view-meta {
  flex: 1;
  min-width: 0;
}

.tm-view-subject {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}

.tm-view-from {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tm-view-addr {
  color: var(--ink-3);
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

.tm-view-frame {
  flex: 1;
  min-height: 320px;
  width: 100%;
  border: none;
  background: #fff;
}

.tm-view-loading {
  padding: 60px 18px;
  text-align: center;
  font-size: 13px;
  color: var(--ink-3);
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
}
</style>
