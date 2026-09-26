import app from '../hono/hono';
import BizError from '../error/biz-error';
import mediaService from '../service/media-service';

app.get('/media/:token', async c => {
	try {
		return await mediaService.get(c, c.req.param('token'));
	} catch (error) {
		if (error instanceof BizError) return c.text('资源不存在或已过期', 404);
		throw error;
	}
});
