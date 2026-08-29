<template>
  <div class="addr-page">
    <div class="addr-toolbar">
      <el-input v-model="keyword" placeholder="搜索地址、发件人或主题" clearable
                @keyup.enter="load(1)" @clear="load(1)">
        <template #append>
          <el-button @click="load(1)">
            <Icon icon="iconoir:search" width="16" height="16"/>
          </el-button>
        </template>
      </el-input>
      <span class="addr-hint">收过信的地址自动出现在这里，生成了没用过的不会记一笔</span>
    </div>

    <el-table :data="rows" v-loading="loading" class="addr-table"
              empty-text="还没有地址收到过邮件">
      <el-table-column label="地址" min-width="230">
        <template #default="{ row }">
          <span class="addr-email" @click="copy(row.toEmail)">{{ row.toEmail }}</span>
        </template>
      </el-table-column>
      <el-table-column label="平台" min-width="140">
        <template #default="{ row }">{{ platformOf(row.lastSender) }}</template>
      </el-table-column>
      <el-table-column label="最近验证码" min-width="120">
        <template #default="{ row }">
          <span v-if="row.lastCode" class="addr-code" @click="copy(row.lastCode)">{{ row.lastCode }}</span>
          <span v-else class="addr-dim">—</span>
        </template>
      </el-table-column>
      <el-table-column label="收信" width="70" align="right">
        <template #default="{ row }">{{ row.mailCount }}</template>
      </el-table-column>
      <el-table-column label="首次" min-width="130">
        <template #default="{ row }"><span class="addr-dim">{{ fmt(row.firstTime) }}</span></template>
      </el-table-column>
      <el-table-column label="最近" min-width="130">
        <template #default="{ row }"><span class="addr-dim">{{ fmt(row.lastTime) }}</span></template>
      </el-table-column>
      <el-table-column label="" width="140" align="right">
        <template #default="{ row }">
          <el-button size="small" text @click="copy(row.toEmail)">复制</el-button>
          <el-button v-if="!row.accountId" v-perm="'account:add'" size="small" type="primary" text
                     :loading="claiming === row.toEmail" @click="claim(row)">收编
          </el-button>
          <span v-else class="addr-owned">已收编</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="addr-more" v-if="hasMore">
      <el-button :loading="loading" @click="load(page + 1)">加载更多</el-button>
    </div>
  </div>
</template>

<script setup>
import {defineOptions, onMounted, ref} from "vue";
import {Icon} from "@iconify/vue";
import {ElMessage} from "element-plus";
import {emailAddresses} from "@/request/email.js";
import {accountAdd} from "@/request/account.js";
import {useAccountStore} from "@/store/account.js";

defineOptions({
  name: 'address'
})

const SIZE = 30

const accountStore = useAccountStore()
const rows = ref([])
const keyword = ref('')
const loading = ref(false)
const page = ref(1)
const hasMore = ref(false)
const claiming = ref('')

onMounted(() => load(1))

async function load(p) {
  loading.value = true
  try {
    const list = await emailAddresses(keyword.value, p, SIZE) || []
    rows.value = p === 1 ? list : rows.value.concat(list)
    page.value = p
    hasMore.value = list.length === SIZE
  } catch (e) {
    ElMessage({message: e?.message || '加载失败', type: 'error', plain: true})
  } finally {
    loading.value = false
  }
}

// 从发件域名推平台：noreply@github.com → github.com。
// 用 SendGrid/Mailgun 代发的推不准，那种只能看主题认。
function platformOf(sender) {
  if (!sender) return '—'
  const domain = String(sender).split('@')[1] || ''
  return domain.replace(/^(mail|email|mailer|noreply|no-reply|smtp|mg|em|notifications?)\./i, '') || '—'
}

function fmt(t) {
  return t ? String(t).slice(0, 16) : '—'
}

async function copy(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage({message: '已复制 ' + text, type: 'success', plain: true})
  } catch {
    ElMessage({message: '浏览器不允许复制，请手动选中', type: 'error', plain: true})
  }
}

// 收编：建成正式邮箱。后端的 claimNoOne 会把这个地址之前收到的信一并归进去
async function claim(row) {
  if (claiming.value) return
  claiming.value = row.toEmail
  try {
    const account = await accountAdd(row.toEmail, '')
    row.accountId = account.accountId
    accountStore.newAccountSignal++
    ElMessage({message: row.toEmail + ' 已收编，之前的信一并归入收件箱', type: 'success', plain: true})
  } catch (e) {
    ElMessage({message: e?.message || '收编失败', type: 'error', plain: true})
  } finally {
    claiming.value = ''
  }
}
</script>

<style scoped>
.addr-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 14px 16px;
  gap: 12px;
}

.addr-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.addr-toolbar .el-input {
  max-width: 340px;
}

.addr-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.addr-table {
  flex: 1;
  min-height: 0;
}

.addr-email {
  font-weight: 500;
  cursor: pointer;
  word-break: break-all;
}

.addr-email:hover {
  color: var(--el-color-primary);
}

.addr-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 600;
  letter-spacing: .05em;
  color: var(--el-color-primary);
  cursor: pointer;
}

.addr-dim {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.addr-owned {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  padding-right: 8px;
}

.addr-more {
  flex-shrink: 0;
  text-align: center;
}
</style>
