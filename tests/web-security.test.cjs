const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('web/app.js', 'utf8');
const helper = source.split('\n')[0];

test('HTML text escaping neutralizes markup and quotes', () => {
  const escape = vm.runInNewContext(helper + '\nescapeHtml');
  assert.equal(escape('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escape("&'"), '&amp;&#39;');
  assert.equal(escape(null), '');
  assert.equal(escape('일반 텍스트'), '일반 텍스트');
});

test('raw external text is not interpolated into HTML templates', () => {
  const htmlRenderers = source.slice(source.indexOf('function renderMapDetail'), source.indexOf('function simulationInputs'));
  for (const expression of ['row.province', 'row.offices.join(" / ")', 'row.grade', 'row.지방청', 'row.위험등급', 'label', 'value']) {
    assert.ok(!htmlRenderers.includes('${' + expression + '}'), expression);
  }
});

test('static internal navigation has unique existing targets', () => {
  const html = fs.readFileSync('web/index.html', 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]));
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /<title>[^<]+<\/title>/);
});
