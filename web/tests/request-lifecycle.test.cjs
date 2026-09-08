const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, process, console, AbortController, DOMException,
    setTimeout, clearTimeout, atob, require: () => ({}), ...globals });
  return exports;
}

test('timeout covers JSON body and releases coalesced GET', async () => {
  let calls = 0;
  let fireTimeout;
  const api = load('lib/api.ts', {
    setTimeout: (fn) => { fireTimeout = fn; return 1; },
    clearTimeout: () => { fireTimeout = null; },
    fetch: async (_, { signal }) => {
      calls++;
      return { ok: true, status: 200, json: () => new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }) };
    },
  }).api;
  const pending = api.get('/slow');
  assert.equal(api.get('/slow'), pending);
  await flush();
  assert.equal(typeof fireTimeout, 'function');
  fireTimeout();
  await assert.rejects(pending, { status: 408 });
  const next = api.get('/slow');
  await flush();
  fireTimeout();
  await assert.rejects(next, { status: 408 });
  assert.equal(calls, 2);
});

for (const status of [200, 500]) {
  test(`caller cancellation covers body for HTTP ${status}`, async () => {
    const controller = new AbortController();
    let reading;
    const started = new Promise(resolve => { reading = resolve; });
    const { api } = load('lib/api.ts', { fetch: async (_, { signal }) => ({
      ok: status === 200, status, json: () => new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        reading();
      }),
    }) });
    const pending = api.get('/cancel', undefined, { signal: controller.signal });
    await started;
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
  });
}

function tokenHarness() {
  const responses = [];
  const effects = [];
  let values = [];
  const hooks = load('hooks/useAccessToken.ts', {
    fetch: () => new Promise(resolve => responses.push(resolve)),
    require: () => ({
      useState: initial => { const state = values; const index = state.length; state.push(initial); return [initial, value => { state[index] = value; }]; },
      useEffect: effect => effects.push(effect),
    }),
  });
  return { hooks, responses, mount() { values = []; hooks.useAccessToken(); return effects.shift(); }, values: () => values };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const response = token => ({ ok: true, status: 200, json: async () => ({ accessToken: token }) });

test('logout invalidates old results without clearing a newer in-flight request', async () => {
  const h = tokenHarness();
  h.mount()();
  h.hooks.clearAccessTokenCache();
  h.mount()();
  h.responses[0](response('old'));
  await flush();
  h.mount()();
  assert.equal(h.values()[0], null);
  assert.equal(h.responses.length, 2);
  h.responses[1](response('new'));
  await flush();
  h.mount()();
  await flush();
  assert.equal(h.values()[0], 'new');
});

test('token cached between render and effect still updates hook state', async () => {
  const h = tokenHarness();
  h.mount()();
  const delayedEffect = h.mount();
  h.responses[0](response('fresh'));
  await flush();
  delayedEffect();
  await flush();
  assert.equal(h.values()[0], 'fresh');
  assert.equal(h.values()[1], false);
});

test('logout while token body is pending discards its credentials', async () => {
  const h = tokenHarness();
  let finish;
  h.mount()();
  h.responses[0]({ ok: true, status: 200, json: () => new Promise(resolve => { finish = resolve; }) });
  await flush();
  h.hooks.clearAccessTokenCache();
  finish({ accessToken: 'stale' });
  await flush();
  h.mount()();
  assert.equal(h.values()[0], null);
  assert.equal(h.responses.length, 2);
  h.responses[1](response('current'));
  await flush();
  assert.equal(h.values()[0], 'current');
});

test('explicit timeout requests are not coalesced with another deadline', async () => {
  let calls = 0;
  const { api } = load('lib/api.ts', { fetch: async () => {
    calls++;
    return { ok: true, status: 204 };
  } });
  const first = api.get('/same', undefined, { timeoutMs: 1000 });
  const second = api.get('/same', undefined, { timeoutMs: 2000 });
  await Promise.all([first, second]);
  assert.equal(calls, 2);
});
