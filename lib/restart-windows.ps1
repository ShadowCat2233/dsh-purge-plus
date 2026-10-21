param([Parameter(Mandatory = $true)][string]$PlanPath)
$ErrorActionPreference = 'Stop'
$plan = Get-Content -LiteralPath $PlanPath -Raw -Encoding UTF8 | ConvertFrom-Json
function Write-RestartLog([string]$message) {
  Add-Content -LiteralPath $plan.logPath -Value ((Get-Date).ToUniversalTime().ToString('o') + ' ' + $message) -Encoding UTF8
}
function Install-Processes {
  @(Get-CimInstance Win32_Process -Filter "Name = 'DeepSeek Harness.exe' OR Name = 'DSH Desktop.exe'" | Where-Object {
    $_.ExecutablePath -and [string]::Equals($_.ExecutablePath, $plan.exe, [StringComparison]::OrdinalIgnoreCase)
  })
}
$stopped = $false
$launched = $false
function Start-Desktop {
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  Remove-Item Env:DSH_PURGE_RESTART -ErrorAction SilentlyContinue
  $env:DSH_HOME = [string]$plan.home
  $env:DSH_PROFILE = 'desktop'
  $env:DSH_DESKTOP_INSTALL = $install
  Start-Process -FilePath $plan.exe -ArgumentList $launchArgs -WorkingDirectory $install -WindowStyle Normal -RedirectStandardOutput ($plan.logPath + '.stdout') -RedirectStandardError ($plan.logPath + '.stderr') -PassThru
}
try {
  Write-RestartLog "ready supervisor=$PID waitPid=$($plan.waitPid)"
  $launchArgs = @('--updated')
  $hostProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($plan.waitPid)"
  $main = if ($hostProcess) { Get-CimInstance Win32_Process -Filter "ProcessId = $($hostProcess.ParentProcessId)" }
  if ($main -and [string]::Equals($main.ExecutablePath, $plan.exe, [StringComparison]::OrdinalIgnoreCase)) {
    if ($main.CommandLine -match '--user-data-dir=(?:"([^"]+)"|(\S+))') {
      $userData = if ($Matches[1]) { $Matches[1] } else { $Matches[2] }
      $launchArgs += ('--user-data-dir="' + $userData + '"')
    }
  }
  $archive = [IO.Path]::GetFullPath([string]$plan.asar)
  $install = Split-Path -Parent $plan.exe
  if (-not [string]::Equals($archive, (Join-Path $install 'resources\app.asar'), [StringComparison]::OrdinalIgnoreCase)) { throw 'Archive does not belong to the selected installation' }
  $app = Join-Path (Split-Path -Parent $archive) 'app'
  if (-not (Test-Path -LiteralPath (Join-Path $app 'package.json'))) { throw 'Prepared application is missing' }
  [IO.File]::WriteAllText($PlanPath + '.ready', 'ready')
  # Allow the HTTP response to flush before stopping the main process.
  Start-Sleep -Milliseconds 1200
  if (Test-Path -LiteralPath ($PlanPath + '.cancel')) { Write-RestartLog 'cancelled before desktop exit'; exit 1 }
  Write-RestartLog 'stopping selected installation'
  $processes = Install-Processes
  if ($main) { Stop-Process -Id $main.ProcessId -Force -ErrorAction SilentlyContinue }
  foreach ($process in $processes) { Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }
  $stopped = $true
  $deadline = (Get-Date).AddSeconds(15)
  do {
    $remaining = Install-Processes
    if ($remaining.Count -eq 0) { break }
    foreach ($process in $remaining) { Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 250
  } while ((Get-Date) -lt $deadline)
  if ((Install-Processes).Count -ne 0) { throw 'Selected desktop processes did not exit' }
  Write-RestartLog 'selected processes exited'
  if (Test-Path -LiteralPath $archive) {
    $backup = $archive + '.bak'
    if (Test-Path -LiteralPath $backup) { $backup += '.' + [Guid]::NewGuid().ToString('N') }
    $moved = $false
    for ($i = 0; $i -lt 60; $i++) {
      try { Move-Item -LiteralPath $archive -Destination $backup; $moved = $true; break }
      catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $moved) { throw 'ASAR remained locked after desktop exit' }
    Write-RestartLog 'archive moved aside'
  }
  $child = Start-Desktop
  $launched = $true
  Write-RestartLog "launched pid=$($child.Id)"
  Start-Sleep -Seconds 4
  if ((Install-Processes).Count -eq 0) { throw 'Relaunched desktop exited immediately' }
  Write-RestartLog 'desktop is running'
} catch {
  Write-RestartLog ('failed: ' + $_.Exception.Message)
  if ($stopped -and -not $launched) {
    try {
      $recovery = Start-Desktop
      Write-RestartLog "recovery launch pid=$($recovery.Id)"
    } catch { Write-RestartLog ('recovery failed: ' + $_.Exception.Message) }
  }
  exit 1
}
