# okkmail 部署与定制说明

基于 [maillab/cloud-mail](https://github.com/maillab/cloud-mail) 定制。上游基线 `5fe5274`。

## 跑在哪

| 地址 | 给谁 | 登录 |
|---|---|---|
| `box.okkmail.cc` | 自己：收件箱 / 地址记录 / 后台 | 要 |
| `temp.okkmail.cc` | 别人：临时邮箱 | 不要，根路径 302 到 `/find` |

一个 Worker（`cloudmail`）+ 一个 D1（`cloudmail-db`）+ 一个 KV。收信走 Cloudflare Email Routing 的
zone 级 catch-all → 这个 Worker。

**catch-all 是 zone 级的，子域没有独立 catch-all。** 所以 `temp.okkmail.cc` 只是入口别名，
不产生地址；公开页生成的地址仍然是 `xxx@okkmail.cc`。

## 部署

```bash
cd ~/Documents/cloud-mail/mail-vue \
  && PATH="/opt/homebrew/Cellar/node/26.0.0/bin:$PATH" pnpm --config.verifyDepsBeforeRun=false build \
  && cd ../mail-worker \
  && CLOUDFLARE_API_TOKEN=$(cat ~/.cf-okkmail-token) PATH="/opt/homebrew/Cellar/node/26.0.0/bin:$PATH" npx wrangler deploy
```

三处都不能省：

- **`PATH`** — 系统默认 node 是 v20，wrangler 要 ≥22，brew 装的 26 没有 link。
- **`--config.verifyDepsBeforeRun=false`** — 否则 pnpm 会先做依赖检查、决定清空重建
  `node_modules`，然后因为没有 TTY 无法确认而中止
  （`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`）。
- **`CLOUDFLARE_API_TOKEN`** — 用 token 而不是 `wrangler login`。OAuth 登录是全局的，
  在别的项目登录另一个 Cloudflare 账号会把它覆盖掉，回来部署就是 `Authentication error [10000]`。
  token 存在 `~/.cf-okkmail-token`（权限 600），限定在本账号 + `okkmail.cc` 这个 zone。

token 权限清单（模板「Edit Cloudflare Workers」+ 手动加 D1）：Workers Scripts / KV / R2 /
Pages / Observability / Containers = Edit，**D1 = Edit**，Zone `okkmail.cc` 的 Workers Routes = Edit。

## 反直觉的默认值（都踩过）

这些开关在 `setting` 表里，**不是环境变量**，改完必须刷缓存。

| 字段 | 默认 | 含义 | 该设成 |
|---|---|---|---|
| `ai_code` | 1 | 常量是 `{OPEN:0, CLOSE:1}`，**1 是关闭** | `0` — 不开的话验证码永远不提取 |
| `no_recipient` | 1 | 拒收未注册地址的信 | `0` — 公开页的随机地址靠它 |
| `register` | 0 | **开放注册** | `1` — 不关的话陌生人能拿你域名注册 |
| `notice_content` | 空 | init 有句 `UPDATE ... WHERE notice_content = ''` | 留一个空格，否则升级时免责声明会自己长回来 |

`PREFIX` 在 wrangler.toml 里，默认 `"tmp"`，不改的话地址会变成 `tmpxxx@`。本项目已设为空。

### 改了 setting 表之后必须刷缓存

设置缓存在 KV，直接改数据库不生效，而且 `query()` 没有 DB 回退——删 KV key 会让整站报
「数据库未初始化」。正确做法是重跑 init（它最后会 `settingService.refresh`）：

```bash
curl "https://box.okkmail.cc/api/init/<jwt_secret>"
```

`jwt_secret` 见 `mail-worker/wrangler.toml`。init 是幂等的，重跑安全。

## 定制点（升级上游时要重新打）

### 后端 `mail-worker/src/`

| 文件 | 改动 |
|---|---|
| `../wrangler.toml` | 域名、绑定、两个 custom domain、`PREFIX=""` |
| `index.js` | `temp.*` 根路径 302 到 `/find` |
| `security/security.js` | `exclude` 加 `/open`（免鉴权前缀） |
| `hono/webs.js` | 注册 `open-api` |
| `api/open-api.js` | **新增**。`/open/recentMails`、`/open/mailContent`、`/open/domains` |
| `service/open-service.js` | **新增**。10 分钟窗口查询 + 域名校验；读正文必须 emailId 和 address 同时匹配，否则能遍历 id 读别人的信 |
| `api/email-api.js` | 加 `/email/addresses` |
| `service/email-service.js` | 加 `addressList()`（地址聚合）、`claimNoOne()`（认领无归属邮件） |
| `service/account-service.js` | `add()` 末尾调 `claimNoOne`，添加邮箱时把历史信一并收编 |

### 前端 `mail-vue/src/`

| 文件 | 改动 |
|---|---|
| `views/find/` | **新增**。公开临时邮箱页，固定暗色，含正文弹窗 |
| `views/address/` | **新增**。地址记录页 |
| `request/open.js` | **新增**。公开接口 |
| `views/email/index.vue` | 收件箱顶部随机地址条（点复制才建号） |
| `components/email-scroll/index.vue` | 加 `header` slot；`grid-template-rows` 改三行 |
| `views/sys-setting/index.vue` | 删「关于」区块 + 停 GitHub 版本检查请求 |
| `layout/account/index.vue` | 添加框的随机按钮 + 添加成功自动复制 |
| `layout/aside/index.vue` | 侧边栏加「地址记录」 |
| `router/index.js` | `/find` 免登录放行；`/addresses` 路由 |
| `store/account.js`、`request/email.js`、`i18n/*.js` | 配套 |

## 设计上的两个决定

**公开页的地址不入库。** 纯前端生成字符串，catch-all 本来就收所有地址，所以服务端零负担，
也不会堆一堆没人用的废账号。信落在「无收件人」，管理端「地址记录」里能看到。

**收件箱顶部那个地址，点「复制」才建账号。** 只看不复制不留痕——复制这个动作本身就等于
「我要用它」。

## 已知代价

`temp.okkmail.cc` 和 `okkmail.cc` 是同一个 zone。公开站被拉进 disposable 黑名单的话，
**根域一起中招，自己的小号会跟着废**。彻底避免要另买一个域名单独跑公开站。

## 资源

- Cloudflare 账号 `A01123490047@gmail.com`，Account ID `79c3d88c58b0a43008575287de4cafb6`
- D1 `cloudmail-db`、KV、Workers AI binding 见 `mail-worker/wrangler.toml`
- 访问密码、管理员密码、`jwt_secret` 也在 `wrangler.toml`（**这个文件别提交到公开仓库**）
