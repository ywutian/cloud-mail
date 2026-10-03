import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, readdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'

import frontEn from '../src/i18n/en.js'
import frontZh from '../src/i18n/zh.js'
import frontEs from '../src/i18n/es.js'
import frontFr from '../src/i18n/fr.js'
import frontJa from '../src/i18n/ja.js'
import frontKo from '../src/i18n/ko.js'
import frontDe from '../src/i18n/de.js'
import frontPt from '../src/i18n/pt.js'
import frontRu from '../src/i18n/ru.js'
import frontIt from '../src/i18n/it.js'
import frontId from '../src/i18n/id.js'
import frontVi from '../src/i18n/vi.js'
import frontTr from '../src/i18n/tr.js'
import frontAr from '../src/i18n/ar.js'
import frontHi from '../src/i18n/hi.js'
import workerEn from '../../mail-worker/src/i18n/en.js'
import workerZh from '../../mail-worker/src/i18n/zh.js'
import workerEs from '../../mail-worker/src/i18n/es.js'
import workerFr from '../../mail-worker/src/i18n/fr.js'
import workerJa from '../../mail-worker/src/i18n/ja.js'
import workerKo from '../../mail-worker/src/i18n/ko.js'
import workerDe from '../../mail-worker/src/i18n/de.js'
import workerPt from '../../mail-worker/src/i18n/pt.js'
import workerRu from '../../mail-worker/src/i18n/ru.js'
import workerIt from '../../mail-worker/src/i18n/it.js'
import workerId from '../../mail-worker/src/i18n/id.js'
import workerVi from '../../mail-worker/src/i18n/vi.js'
import workerTr from '../../mail-worker/src/i18n/tr.js'
import workerAr from '../../mail-worker/src/i18n/ar.js'
import workerHi from '../../mail-worker/src/i18n/hi.js'
import {getBrowserLanguage, intlLanguage, languages, manifestPath, normalizeLanguage, resolveLanguage} from '../src/i18n/languages.js'
import {requestLanguage, t} from '../../mail-worker/src/i18n/i18n.js'

const frontend = {en: frontEn, zh: frontZh, es: frontEs, fr: frontFr, ja: frontJa, ko: frontKo, de: frontDe, pt: frontPt, ru: frontRu, it: frontIt, id: frontId, vi: frontVi, tr: frontTr, ar: frontAr, hi: frontHi}
const backend = {en: workerEn, zh: workerZh, es: workerEs, fr: workerFr, ja: workerJa, ko: workerKo, de: workerDe, pt: workerPt, ru: workerRu, it: workerIt, id: workerId, vi: workerVi, tr: workerTr, ar: workerAr, hi: workerHi}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src')
const workerRoot = resolve(root, '../../mail-worker/src')

function flatten(tree, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix + key
    if (typeof value === 'string') result[path] = value
    else flatten(value, path + '.', result)
  }
  return result
}

function files(path) {
  return readdirSync(path, {withFileTypes: true}).flatMap(entry =>
    entry.isDirectory() ? files(resolve(path, entry.name)) : [resolve(path, entry.name)])
}

test('all selectable languages have complete keys and matching placeholders', () => {
  assert.deepEqual(Object.keys(frontend).sort(), languages.map(language => language.code).sort())
  assert.deepEqual(Object.keys(backend).sort(), languages.map(language => language.code).sort())
  for (const [surface, locales] of Object.entries({frontend, backend})) {
    const reference = flatten(locales.en)
    for (const [language, tree] of Object.entries(locales)) {
      const current = flatten(tree)
      assert.deepEqual(Object.keys(current).sort(), Object.keys(reference).sort(), surface + ':' + language)
      for (const [key, value] of Object.entries(current)) {
        assert.ok(value.trim(), surface + ':' + language + ':' + key)
        const slots = text => [...text.matchAll(/\{\{?\w+\}?\}/g)].map(match => match[0]).sort()
        assert.deepEqual(slots(value), slots(reference[key]), surface + ':' + language + ':' + key)
      }
    }
  }
})

test('literal translation keys used by the interface exist', () => {
  const messages = flatten(frontEn)
  for (const path of files(root)) {
    if (!/\.(vue|js)$/.test(path) || path.includes('/i18n/')) continue
    const source = readFileSync(path, 'utf8')
    for (const match of source.matchAll(/(?:\$t|(?<![\w.])t)\(['"]([a-zA-Z][\w.-]*)['"]/g)) {
      assert.ok(match[1] in messages, path + ':' + match[1])
    }
  }
})

test('literal server translation keys exist', () => {
  const messages = flatten(workerEn)
  for (const path of files(workerRoot)) {
    if (!path.endsWith('.js') || path.includes('/i18n/')) continue
    const source = readFileSync(path, 'utf8')
    for (const match of source.matchAll(/\bt\(c,\s*['"]([a-zA-Z][\w.-]*)['"]\s*(?=[,)])/g)) {
      assert.ok(match[1] in messages, path + ':' + match[1])
    }
  }
})

test('browser preference and manual selection resolve all supported languages', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  try {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {languages: ['zh-TW', 'pt-PT', 'it-IT', 'ru-RU'], language: 'zh-TW'},
    })
    assert.equal(getBrowserLanguage(), 'it')
    assert.equal(resolveLanguage('auto'), 'it')
    assert.equal(resolveLanguage('ja'), 'ja')
    assert.equal(normalizeLanguage('pt-BR'), 'pt')
    assert.equal(normalizeLanguage('zh-Hant'), null)
    assert.equal(normalizeLanguage('pt-PT'), null)
    assert.equal(normalizeLanguage('xx-XX'), null)
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous)
    else delete globalThis.navigator
  }
})

test('both home screen apps have a localized manifest for every language', () => {
  for (const {code} of languages) {
    for (const temporary of [false, true]) {
      const path = resolve(root, '../public' + manifestPath(code, temporary))
      const manifest = JSON.parse(readFileSync(path, 'utf8'))
      assert.equal(manifest.lang, intlLanguage(code), path)
      assert.equal(manifest.dir, code === 'ar' ? 'rtl' : 'ltr', path)
      assert.equal(manifest.id, temporary ? '/temporary-mail-app' : '/mail-app', path)
      assert.ok(manifest.name.trim() && manifest.description.trim(), path)
    }
  }
})

test('server translations stay bound to each request', async () => {
  const context = value => ({req: {header: () => value}})
  const spanish = context('es-ES,ru;q=0.7')
  const russian = context('ru-RU,es;q=0.7')
  assert.equal(requestLanguage(context('nl-NL,fr-FR;q=0.9,ru;q=0.8')), 'fr')
  assert.equal(requestLanguage(context('de;q=0,ja;q=0.8')), 'ja')
  const results = await Promise.all(Array.from({length: 20}, (_, index) =>
    Promise.resolve().then(() => t(index % 2 ? russian : spanish, 'IncorrectPwd'))))
  assert.deepEqual(new Set(results.filter((_, index) => index % 2 === 0)), new Set([workerEs.IncorrectPwd]))
  assert.deepEqual(new Set(results.filter((_, index) => index % 2 === 1)), new Set([workerRu.IncorrectPwd]))
  assert.match(t(spanish, 'minEmailPrefix', {msg: 6}), /6/)
})
