import test from 'node:test';
import assert from 'node:assert/strict';

import translator, {requestLanguage, t} from '../src/i18n/i18n.js';
import emailTextTemplate from '../src/template/email-text.js';
import en from '../src/i18n/en.js';
import expanded from '../src/i18n/expanded.js';
import {languages} from '../../mail-vue/src/i18n/languages.js';

const context = value => ({req: {header: () => value}});

test('request language honors quality, whitespace, and unavailable choices', () => {
	assert.equal(requestLanguage(context('fr-FR,fr;q=0.9,en;q=0.8')), 'fr');
	assert.equal(requestLanguage(context('fr; q=0.9, en; q=0.8')), 'fr');
	assert.equal(requestLanguage(context('de;q=0,ja;q=0.8')), 'ja');
	assert.equal(requestLanguage(context('es;q=0.8,fr;q=0.8')), 'es');
	assert.equal(requestLanguage(context('es;q=2,fr;q=0.8')), 'fr');
	assert.equal(requestLanguage(context('nl-NL,fr-CA;q=0.9')), 'fr');
	assert.equal(requestLanguage(context('nl-NL')), 'en');
	assert.equal(requestLanguage(context('')), 'en');
	for (const {code} of languages) assert.equal(requestLanguage(context(code)), code);
});

test('script and regional variants select the corresponding available dictionary', () => {
	assert.equal(requestLanguage(context('zh-Hant')), 'zh-Hant');
	assert.equal(requestLanguage(context('zh-TW,zh;q=0.9,en;q=0.8')), 'zh-Hant');
	assert.equal(requestLanguage(context('zh-TW,zh-Hans-CN;q=0.9')), 'zh-Hant');
	assert.equal(requestLanguage(context('pt-PT,pt;q=0.9,en;q=0.8')), 'pt');
	assert.equal(requestLanguage(context('pt-PT,pt-BR;q=0.9')), 'pt');
	assert.equal(requestLanguage(context('pt-BR')), 'pt');
});

test('additional server dictionaries contain only reviewed languages and preserve interpolation', () => {
	assert.deepEqual(Object.keys(expanded), ['zh-Hant']);
	const reference = Object.keys(en).sort();
	const placeholders = value => [...value.matchAll(/\{\{\w+\}\}/g)].map(match => match[0]).sort();
	for (const [language, messages] of Object.entries(expanded)) {
		assert.deepEqual(Object.keys(messages).sort(), reference, language);
		assert.deepEqual(Object.keys(messages.perms).sort(), Object.keys(en.perms).sort(), language + ':perms');
		for (const [key, source] of Object.entries(en)) {
			if (typeof source === 'string') {
				assert.ok(messages[key].trim(), language + ':' + key);
				assert.deepEqual(placeholders(messages[key]), placeholders(source), language + ':' + key);
			}
		}
		assert.equal(requestLanguage(context(language)), language);
		assert.equal(t(context(language), 'IncorrectPwd'), messages.IncorrectPwd);
		assert.match(t(context(language), 'minEmailPrefix', {msg: 6}), /6/);
		assert.match(messages.bannedSend, /權限/);
		assert.match(messages.isDelUser, /註銷/);
		assert.doesNotMatch(messages.isDelUser, /登出/);
		assert.match(messages.isBanUser, /停用/);
		assert.match(messages.attachmentGone, /附件/);
		assert.match(messages.perms['邮件删除'], /刪除/);
		assert.match(messages.perms['邮箱删除'], /刪除/);
		assert.match(messages.perms['用户删除'], /刪除/);
	}
});

test('system error pages use the request language without labeling mail content as English', () => {
	const french = context('fr-FR');
	const errorPage = emailTextTemplate(t(french, 'telegramAccessDenied'), requestLanguage(french));
	assert.match(errorPage, /<html lang='fr-FR' dir='ltr'>/);
	assert.ok(errorPage.includes(t(french, 'telegramAccessDenied')));
	const traditionalChinese = context('zh-TW');
	assert.match(emailTextTemplate(t(traditionalChinese, 'telegramAccessDenied'), requestLanguage(traditionalChinese)), /<html lang='zh-TW' dir='ltr'>/);
	const mailPage = emailTextTemplate('Bonjour');
	assert.match(mailPage, /<html>/);
	assert.doesNotMatch(mailPage, /lang='en'/);
});

test('all 16 published server languages have complete messages and interpolation fields', () => {
	const placeholders = value => [...value.matchAll(/\{\{\w+\}\}/g)].map(match => match[0]).sort();
	assert.equal(languages.length, 16);
	for (const {code: language} of languages) {
		const messages = translator.getResourceBundle(language, 'translation');
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
