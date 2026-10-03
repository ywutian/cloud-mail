import i18next from 'i18next';
import zh from './zh.js';
import en from './en.js';
import es from './es.js';
import fr from './fr.js';
import ja from './ja.js';
import ko from './ko.js';
import de from './de.js';
import pt from './pt.js';
import ru from './ru.js';

const resources = Object.fromEntries(
	Object.entries({zh, en, es, fr, ja, ko, de, pt, ru})
		.map(([language, translation]) => [language, {translation}]),
);

const translator = i18next.createInstance();
translator.init({
	resources,
	lng: 'en',
	fallbackLng: 'en',
	initImmediate: false,
	interpolation: {escapeValue: false},
});

export function requestLanguage(c) {
	const preferences = c?.req?.header('accept-language') || '';
	const ranked = preferences.split(',').map((entry, index) => {
		const [tag, weight] = entry.trim().split(';q=');
		return {language: tag?.toLowerCase().split(/[-_]/)[0], quality: weight === undefined ? 1 : Number(weight), index};
	}).sort((a, b) => b.quality - a.quality || a.index - b.index);
	return ranked.find(({language, quality}) => quality > 0 && resources[language])?.language || 'en';
}

export function t(c, key, values) {
	return translator.t(key, {lng: requestLanguage(c), ...values});
}

export default translator;
