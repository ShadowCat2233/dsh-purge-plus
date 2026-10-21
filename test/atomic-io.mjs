import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { atomicCopyFile, atomicWriteFile, backupAll, revertAll } from '../lib/core.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-purge-atomic-'));
const originalNow = Date.now;
try {
  const source = path.join(root, 'source.txt');
  const copied = path.join(root, 'backup.txt');
  const written = path.join(root, 'written.txt');
  await fs.writeFile(source, 'complete-backup');
  // Force the same millisecond: PID + Date.now previously reused one temp file.
  Date.now = () => 1792610232441;
  const copies = await Promise.allSettled(Array.from({ length: 32 }, () => atomicCopyFile(source, copied)));
  assert.equal(copies.filter(r => r.status === 'rejected').length, 0, 'concurrent backups must not lose their temp files');
  assert.equal(await fs.readFile(copied, 'utf8'), 'complete-backup');
  const values = Array.from({ length: 32 }, (_, i) => `${i}:` + 'x'.repeat(4096));
  const writes = await Promise.allSettled(values.map(value => atomicWriteFile(written, value)));
  assert.equal(writes.filter(r => r.status === 'rejected').length, 0, 'concurrent writes must use distinct temp files');
  assert.ok(values.includes(await fs.readFile(written, 'utf8')), 'last writer must leave one complete value');
  assert.deepEqual((await fs.readdir(root)).sort(), ['backup.txt', 'source.txt', 'written.txt']);
  const aiBase = path.join(root, 'node_modules', '@deepseek-ai');
  const target = path.join(aiBase, 'dsh-agent-instructions', 'lib', 'index.js');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, 'original fixture');
  const backup = await backupAll(aiBase);
  assert.equal(backup.errors.length, 0, JSON.stringify(backup.errors));
  assert.ok(backup.made.includes(target + '.dshpurge.bak'));
  await fs.writeFile(target, 'modified fixture');
  const reverted = await revertAll(aiBase);
  assert.equal(reverted.errors.length, 0);
  assert.equal(await fs.readFile(target, 'utf8'), 'original fixture');
  console.log('PASS: 32 concurrent backups, 32 concurrent writes, complete contents, no temp-file leaks');
  console.log('PASS: backupAll creates a usable backup; revertAll restores exact original contents');
} finally {
  Date.now = originalNow;
  const resolved = path.resolve(root);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
  await fs.rm(resolved, { recursive: true, force: true });
}
