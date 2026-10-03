export default function emailTextTemplate(text, language) {
	text = String(text).replace(/[&<>"']/g, char => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
	})[char]);
	const langAttribute = /^[a-z]{2,8}$/i.test(language || '') ? ` lang='${language}'` : '';
	return `<!DOCTYPE html>
<html${langAttribute}>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        html {
            margin: 0;
            padding: 0;
            background: #FFF;
        }

        body {
        		box-sizing: border-box;
        		margin: 0;
        		padding: 10px 10px;
            width: 100%;
            height: 100%;
            overflow: auto; /* 改为 auto 允许滚动 */
        }

        span {
        		font-family: inherit;
						white-space: pre-wrap;
						word-break: break-word;
        }

    </style>
</head>
<body>
<span>${text}</span>
</body>
</html>`
}
