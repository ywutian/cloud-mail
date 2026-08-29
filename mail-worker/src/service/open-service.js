import BizError from '../error/biz-error';

// 公开查码：不登录，输入地址就能看它最近 10 分钟收到的信。
// 这是公开临时邮箱站的常规做法，代价是知道地址的人都能读——
// 10 分钟窗口把危害限制在「注册当下正好被人盯着」这一种情况。
const OPEN_WINDOW_MINUTES = 10;

const openService = {

	async recentMails(c, params) {

		const address = (params.address || '').trim().toLowerCase();

		if (!address) {
			throw new BizError('请输入邮箱地址');
		}

		let domains = c.env.domain;
		if (typeof domains === 'string') {
			try {
				domains = JSON.parse(domains);
			} catch {
				domains = [];
			}
		}
		domains = Array.isArray(domains) ? domains : [];

		if (!domains.some(d => address.endsWith('@' + String(d).toLowerCase()))) {
			throw new BizError('不是本站的邮箱域名');
		}

		// 只取摘要字段，不返回正文，少暴露一层
		const { results } = await c.env.db.prepare(
			`SELECT email_id AS emailId,
			        send_email AS sendEmail,
			        name       AS sendName,
			        subject,
			        code,
			        create_time AS createTime
			 FROM email
			 WHERE to_email COLLATE NOCASE = ?
			   AND type = 0
			   AND is_del = 0
			   AND create_time > datetime('now', '-${OPEN_WINDOW_MINUTES} minutes')
			 ORDER BY email_id DESC
			 LIMIT 20`
		).bind(address).all();

		return results || [];
	}
};

export default openService;
