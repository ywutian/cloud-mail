import test from 'node:test';
import assert from 'node:assert/strict';

import {requestLanguage, t} from '../src/i18n/i18n.js';
import emailTextTemplate from '../src/template/email-text.js';
import en from '../src/i18n/en.js';
import it from '../src/i18n/it.js';
import id from '../src/i18n/id.js';
import vi from '../src/i18n/vi.js';
import tr from '../src/i18n/tr.js';
import ar from '../src/i18n/ar.js';
import hi from '../src/i18n/hi.js';

const context = value => ({req: {header: () => value}});

test('request language honors quality, whitespace, and unavailable choices', () => {
	assert.equal(requestLanguage(context('fr-FR,fr;q=0.9,en;q=0.8')), 'fr');
	assert.equal(requestLanguage(context('fr; q=0.9, en; q=0.8')), 'fr');
	assert.equal(requestLanguage(context('de;q=0,ja;q=0.8')), 'ja');
	assert.equal(requestLanguage(context('es;q=0.8,fr;q=0.8')), 'es');
	assert.equal(requestLanguage(context('es;q=2,fr;q=0.8')), 'fr');
	assert.equal(requestLanguage(context('nl-NL,fr-CA;q=0.9')), 'fr');
	assert.equal(requestLanguage(context('')), 'en');
});

test('unsupported scripts and regional Portuguese use an explicit fallback', () => {
	assert.equal(requestLanguage(context('zh-Hant')), 'en');
	assert.equal(requestLanguage(context('zh-TW,zh;q=0.9,en;q=0.8')), 'zh');
	assert.equal(requestLanguage(context('zh-TW,zh-Hans-CN;q=0.9')), 'zh');
	assert.equal(requestLanguage(context('pt-PT,pt;q=0.9,en;q=0.8')), 'pt');
	assert.equal(requestLanguage(context('pt-PT,pt-BR;q=0.9')), 'pt');
	assert.equal(requestLanguage(context('pt-BR')), 'pt');
});

test('system error pages use the request language without labeling mail content as English', () => {
	const french = context('fr-FR');
	const errorPage = emailTextTemplate(t(french, 'telegramAccessDenied'), requestLanguage(french));
	assert.match(errorPage, /<html lang='fr'>/);
	assert.ok(errorPage.includes(t(french, 'telegramAccessDenied')));
	const mailPage = emailTextTemplate('Bonjour');
	assert.match(mailPage, /<html>/);
	assert.doesNotMatch(mailPage, /lang='en'/);
});

test('six additional server languages have complete messages and interpolation fields', () => {
	const placeholders = value => [...value.matchAll(/\{\{\w+\}\}/g)].map(match => match[0]).sort();
	for (const [language, messages] of Object.entries({it, id, vi, tr, ar, hi})) {
		assert.deepEqual(Object.keys(messages).sort(), Object.keys(en).sort(), language);
		assert.deepEqual(Object.keys(messages.perms).sort(), Object.keys(en.perms).sort(), language + ':perms');
		for (const [key, reference] of Object.entries(en)) {
			if (typeof reference !== 'string') continue;
			assert.ok(messages[key].trim(), language + ':' + key);
			assert.deepEqual(placeholders(messages[key]), placeholders(reference), language + ':' + key);
		}
		assert.equal(requestLanguage(context(language.toUpperCase() + '-XX')), language);
		assert.equal(t(context(language), 'bannedSend'), messages.bannedSend);
	}
});
