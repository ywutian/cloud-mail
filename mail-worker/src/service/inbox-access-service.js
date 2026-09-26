import BizError from '../error/biz-error';

function configuredDomains(env) {
	let domains = env.domain;
	if (typeof domains === 'string') {
		try { domains = JSON.parse(domains); } catch { domains = []; }
	}
	return Array.isArray(domains) ? domains.map(value => String(value).toLowerCase()) : [];
}

const inboxAccessService = {
	async create(c) {
		const domain = configuredDomains(c.env)[0];
		if (!domain) throw new BizError('临时邮箱域名未配置', 503);

		for (let attempt = 0; attempt < 3; attempt++) {
			const address = `t${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}@${domain}`;
			const account = await c.env.db.prepare('SELECT 1 FROM account WHERE email COLLATE NOCASE = ? LIMIT 1').bind(address).first();
			if (!account) return { address };
		}
		throw new BizError('暂时无法生成邮箱地址', 503);
	},

	async assertPublicAddress(c, address) {
		const normalized = String(address || '').trim().toLowerCase();
		const parts = normalized.split('@');
		if (parts.length !== 2 || !/^[a-z0-9._%+-]{1,64}$/.test(parts[0]) ||
			!configuredDomains(c.env).includes(parts[1])) {
			throw new BizError('临时邮箱地址无效', 400);
		}

		const baseAddress = `${parts[0].split('+')[0]}@${parts[1]}`;
		const account = await c.env.db.prepare(
			'SELECT 1 FROM account WHERE email COLLATE NOCASE IN (?, ?) LIMIT 1'
		).bind(normalized, baseAddress).first();
		if (account) throw new BizError('此地址属于正式邮箱，不能公开查询', 403);
		return normalized;
	}
};

export default inboxAccessService;
