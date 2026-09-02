import app from '../hono/hono';
import result from '../model/result';
import openService from '../service/open-service';

// /open 前缀在 security.js 的 exclude 里，免鉴权
app.get('/open/recentMails', async (c) => {
	const list = await openService.recentMails(c, c.req.query());
	return c.json(result.ok(list));
});

app.get('/open/mailContent', async (c) => {
	const row = await openService.mailContent(c, c.req.query());
	return c.json(result.ok(row));
});

// 公开页要知道域名才能拼地址，没登录拿不到 settingStore
app.get('/open/domains', async (c) => {
	let domains = c.env.domain;
	if (typeof domains === 'string') {
		try { domains = JSON.parse(domains); } catch { domains = []; }
	}
	return c.json(result.ok(Array.isArray(domains) ? domains : []));
});
