import app from './hono/webs';
import { email } from './email/email';
import userService from './service/user-service';
import verifyRecordService from './service/verify-record-service';
import emailService from './service/email-service';
import kvObjService from './service/kv-obj-service';
import oauthService from './service/oauth-service';
import analysisService from './service/analysis-service';
export default {
	 async fetch(req, env, ctx) {

		const url = new URL(req.url)

		// temp.* 是给别人的公开入口，进来直接到查码页，不给看登录页
		if (url.hostname.startsWith('temp.') && url.pathname === '/') {
			return Response.redirect(url.origin + '/find', 302)
		}

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '')
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		if (url.pathname.startsWith('/attachments/')) {
			return new Response('Not found', { status: 404 });
		}

		if (url.pathname.startsWith('/static/background/')) {
			const object = await kvObjService.toObjResp({ env }, url.pathname.substring(1));
			const type = object?.headers.get('Content-Type');
			if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type)) {
				return new Response('Not found', { status: 404 });
			}
			const response = new Response(object.body, object);
			response.headers.set('X-Content-Type-Options', 'nosniff');
			return response;
		}

		return env.assets.fetch(req);
	},
	email: email,
	async scheduled(c, env, ctx) {
		if (c.cron === '*/30 * * * *') {
			await analysisService.refreshEchartsCache({ env })
			return;
		}

		await verifyRecordService.clearRecord({ env })
		await userService.resetDaySendCount({ env })
		await emailService.completeReceiveAll({ env })
		await emailService.autoClean({ env })
		await analysisService.refreshEchartsCache({ env })
		await oauthService.clearNoBindOathUser({ env })
	},
};
