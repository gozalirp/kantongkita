const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('public/css/style.css', 'utf8');
assert.match(css, /@font-face\s*\{[^}]*font-family:"Sora";[^}]*src:url\("\.\.\/fonts\/Sora-Variable\.ttf"\)[^}]*font-weight:100 800;[^}]*font-display:swap;/);
assert.match(css, /font:15px\/1\.5 "Sora",/);
assert.doesNotMatch(css, /Plus Jakarta Sans/);
const font = fs.readFileSync('public/fonts/Sora-Variable.ttf');
assert.ok(font.length > 10000);
assert.equal(font.readUInt32BE(0), 0x00010000, 'valid TrueType header');
assert.match(fs.readFileSync('public/fonts/Sora-OFL.txt', 'utf8'), /SIL OPEN FONT LICENSE/);
for (const page of ['index.html', 'akun-email.html']) {
  const html = fs.readFileSync('public/' + page, 'utf8');
  assert.match(html, /rel="preload" href="\/fonts\/Sora-Variable.ttf" as="font" type="font\/ttf" crossorigin/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com|Plus\+Jakarta/);
}
assert.match(fs.readFileSync('public/sw.js', 'utf8'), /'\.\/fonts\/Sora-Variable\.ttf'/);
console.log('PASS: local licensed Sora shared by web/recovery and offline precache');
