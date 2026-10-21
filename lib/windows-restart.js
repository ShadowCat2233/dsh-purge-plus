import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function windowsRestartPlan({ exe, asar = '', waitPid = process.pid, home = '' }) {
  const executable = path.resolve(exe);
  const install = path.dirname(executable);
  if (!/^(DeepSeek Harness|DSH Desktop)\.exe$/i.test(path.basename(executable))) throw new Error('Unexpected desktop executable');
  const archive = asar ? path.resolve(asar) : path.join(install, 'resources', 'app.asar');
  if (archive.toLowerCase() !== path.join(install, 'resources', 'app.asar').toLowerCase()) throw new Error('Restart archive is outside the selected installation');
  return { exe: executable, asar: archive, waitPid, home: home ? path.resolve(home) : '' };
}

// The supervisor must outlive the Electron Host's child job.
export function scheduleWindowsRestart(input) {
  const plan = windowsRestartPlan(input);
  const id = randomUUID();
  const dir = path.join(plan.home || os.tmpdir(), 'dsh-purge', 'restart');
  fs.mkdirSync(dir, { recursive: true });
  const planPath = path.join(dir, `${id}.json`);
  const logPath = path.join(dir, `${id}.log`);
  fs.writeFileSync(planPath, JSON.stringify({ ...plan, logPath }), { mode: 0o600 });
  const script = fileURLToPath(new URL('./restart-windows.ps1', import.meta.url));
  const shell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const command = `"${shell}" -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "${script}" -PlanPath "${planPath}"`;
  const encoded = Buffer.from(command, 'utf8').toString('base64');
  const cwd = Buffer.from(path.dirname(plan.exe), 'utf8').toString('base64');
  const bootstrap = [
    "$ErrorActionPreference='Stop'",
    '[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)',
    `$cmd=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}'))`,
    `$cwd=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${cwd}'))`,
    "$startup=New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{WinstationDesktop='winsta0\\default';ShowWindow=[uint16]0}",
    "$result=Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine=$cmd;CurrentDirectory=$cwd;ProcessStartupInformation=$startup}",
    'if($result.ReturnValue -ne 0){throw "Restart supervisor creation failed: $($result.ReturnValue)"}',
    'Write-Output $result.ProcessId',
  ].join(';');
  let pid;
  try {
    pid = Number(execFileSync(shell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(bootstrap, 'utf16le').toString('base64')], {
      encoding: 'utf8', timeout: 20000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    }).trim());
    if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Restart supervisor did not return a PID');
    const deadline = Date.now() + 10000;
    while (!fs.existsSync(planPath + '.ready')) {
      if (fs.existsSync(logPath) && fs.readFileSync(logPath, 'utf8').includes('failed:')) throw new Error('Supervisor rejected the restart plan');
      if (Date.now() >= deadline) throw new Error('Supervisor readiness timed out');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  } catch (error) {
    fs.writeFileSync(planPath + '.cancel', 'cancel');
    fs.appendFileSync(logPath, `${new Date().toISOString()} dispatch failed: ${String(error.stderr || error.message)}\n`);
    throw new Error(`Desktop restart could not be prepared; the application was kept running. Log: ${logPath}`);
  }
  // No Host self-exit timer: the supervisor stops the main process first.
  return { restarting: true, engine: 'windows-supervisor', supervisorPid: pid, restartId: id, logPath };
}
