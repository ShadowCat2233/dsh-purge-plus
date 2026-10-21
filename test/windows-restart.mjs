import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { windowsRestartPlan, scheduleWindowsRestart } from '../lib/windows-restart.js';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-restart-test-'));
const exe = path.join(root, 'DeepSeek Harness.exe');
assert.throws(() => windowsRestartPlan({ exe: path.join(root, 'other.exe') }), /Unexpected/);
assert.throws(() => windowsRestartPlan({ exe, asar: path.join(root, 'other.asar') }), /outside/);
assert.equal(windowsRestartPlan({ exe }).asar, path.join(root, 'resources', 'app.asar'));
console.log('PASS: executable name and archive installation boundary');
if (process.platform === 'win32') {
  // A real supervisor must reject an unprepared installation before stopping anything.
  assert.throws(() => scheduleWindowsRestart({ exe, home: root }), /kept running/);
  const dir = path.join(root, 'dsh-purge', 'restart');
  const log = fs.readdirSync(dir).find(name => name.endsWith('.log'));
  const contents = fs.readFileSync(path.join(dir, log), 'utf8');
  assert.match(contents, /Prepared application is missing/);
  assert.doesNotMatch(contents, /stopping selected installation/);
  console.log('PASS: actual Windows supervisor rejects missing prepared app before desktop exit');
}
// Keep the tiny failure journal available for diagnosis; it contains no account data.
console.log(`Evidence: ${root}`);
