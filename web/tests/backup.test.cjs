const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

for (const failure of ['none', 'dump', 'gzip']) {
  test(`backup publication and retention: ${failure}`, () => {
    const script = fs.readFileSync(path.join(__dirname, '../../infra/postgres/backup.sh'), 'utf8')
      .replace('DIR=/backups', 'DIR="$TEST_DIR"');
    // Execute the real script with isolated command doubles and a temporary backup directory.
    const prelude = `
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT
export PGDATABASE=brooks PGHOST=test
pg_dump() { echo 'SELECT 1;'; return ${failure === 'dump' ? 1 : 0}; }
gzip() { ${failure === 'gzip' ? 'return 1' : 'command gzip "$@"'}; }
find() { echo pruned > "$TEST_DIR/pruned"; }
sleep() {
  count=$(command find "$TEST_DIR" -name '*.sql.gz' | wc -l)
  [ "$count" -eq ${failure === 'none' ? 1 : 0} ] || exit 91
  [ ! -e "$TEST_DIR/pruned" ] ${failure === 'none' ? '&& exit 92' : '|| exit 92'}
  count=$(command find "$TEST_DIR" -name '*.partial' | wc -l)
  [ "$count" -eq 0 ] || exit 93
  exit 0
}
`;
    const shell = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/sh';
    const result = spawnSync(shell, ['-s'], { input: prelude + script, encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stdout.includes('[db-backup] ok:'), failure === 'none');
  });
}
