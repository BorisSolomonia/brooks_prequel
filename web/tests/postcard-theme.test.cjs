const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const tailwind = require('tailwindcss');

const root = path.resolve(__dirname, '..');
const tokens = postcss.parse(fs.readFileSync(path.join(root, 'src/app/tokens.css'), 'utf8'));
const styles = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
function theme(selector) {
  const values = {};
  for (const name of [':root', selector]) {
    tokens.nodes.filter(node => node.type === 'rule' && node.selector === name)
      .forEach(rule => rule.walkDecls(decl => { values[decl.prop] = decl.value; }));
  }
  return values;
}
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
for (const name of [':root', '.dark', '.dim']) {
  test(`${name}: text, actions and status colors meet AA normal-text contrast`, () => {
    const values = theme(name);
    const pairs = ['--text-primary', '--text-secondary', '--text-tertiary', '--success', '--error']
      .flatMap(fg => ['--bg-primary', '--bg-elevated'].map(bg => [fg, bg]));
    pairs.push(['--on-action', '--action-primary'], ['--on-action', '--action-hover']);
    for (const [fg, bg] of pairs) {
      const a = luminance(values[fg]);
      const b = luminance(values[bg]);
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      assert.ok(ratio >= 4.5, `${name} ${fg}/${bg}: ${ratio.toFixed(2)}`);
    }
  });
}
test('Tailwind retains shared component variants and stable map viewport', async () => {
  const output = await postcss([tailwind({
    content: [path.join(root, 'src/**/*.{ts,tsx}')],
    corePlugins: { preflight: false },
  })]).process(styles, { from: path.join(root, 'src/app/globals.css') });
  const selectors = new Set();
  output.root.walkRules(rule => selectors.add(rule.selector));
  for (const selector of ['.pc-button-secondary', '.pc-button-quiet', '.pc-header', '.pc-map', '.pc-map-cluster', '.pc-guide-card']) {
    assert.ok(selectors.has(selector), `Missing compiled selector ${selector}`);
  }
  output.root.walkRules('.pc-map', rule => {
    const height = rule.nodes.find(node => node.prop === 'height');
    assert.match(height.value, /100svh/);
    assert.match(height.value, /var\(--header-height\)/);
    assert.match(height.value, /var\(--bottom-nav-height\)/);
  });
});
