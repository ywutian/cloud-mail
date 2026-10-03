import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'
import vm from 'node:vm'
import {languages} from '../src/i18n/languages.js'

const packs = {
  zh: 'zh_CN', es: 'es', fr: 'fr_FR', ja: 'ja', ko: 'ko_KR', de: 'de',
  pt: 'pt_BR', ru: 'ru', it: 'it', id: 'id', vi: 'vi', tr: 'tr', ar: 'ar', hi: 'hi',
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../public/tinymce/langs')

test('every non-English interface language has a usable local editor pack', () => {
  assert.deepEqual(Object.keys(packs).sort(), languages.map(({code}) => code).filter(code => code !== 'en').sort())
  for (const [language, pack] of Object.entries(packs)) {
    let registration
    const source = readFileSync(resolve(root, `${pack}.js`), 'utf8')
    vm.runInNewContext(source, {tinymce: {addI18n: (name, values) => { registration = {name, values} }}})
    assert.equal(registration?.name, pack, language)
    assert.ok(Object.keys(registration.values).length >= 400, language)
    assert.ok(registration.values.Bold && registration.values.Bold !== 'Bold', language)
    assert.ok(registration.values.Cancel && registration.values.Cancel !== 'Cancel', language)
  }
})
