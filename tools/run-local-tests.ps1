# ShambConkins Windows local, zero-GitHub-Actions test harness.
# Run from RUN-LOCAL-TESTS.cmd (Full) or RUN-QUICK-TESTS.cmd (Quick).
# Creates only ignored node_modules/, dist/, local-test-reports/.
[CmdletBinding()]
param(
    [ValidateSet('Full', 'Quick', 'Background')][string]$Mode = 'Full',
    [switch]$NoSetup
)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $Root
$RunId = Get-Date -Format 'yyyyMMdd-HHmmss'
$ReportDir = Join-Path $Root ("local-test-reports\{0}-{1}" -f $RunId, $Mode.ToLowerInvariant())
New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
$env:SHAMB_SHOTS_DIR = Join-Path $ReportDir 'screenshots'
New-Item -ItemType Directory -Path $env:SHAMB_SHOTS_DIR -Force | Out-Null
$env:SHOT = Join-Path $env:SHAMB_SHOTS_DIR 'home.png'
$env:SHAMB_FILE = Join-Path $Root 'dist\ShambConkins.html'
$script:Failures = New-Object System.Collections.Generic.List[string]
$script:Passes = New-Object System.Collections.Generic.List[string]
$script:FailureDetails = New-Object System.Collections.Generic.List[string]
$script:StepNumber = 0
$BrowserReady = $false
$script:BackgroundMutex = $null
if ($Mode -eq 'Background') {
    $script:BackgroundMutex = New-Object System.Threading.Mutex($false, 'Local\ShambConkinsLocalBackgroundTests')
    if (-not $script:BackgroundMutex.WaitOne(0)) {
        Write-Host 'Background testing is already running. Not starting another copy.' -ForegroundColor Yellow
        exit 2
    }
}

Write-Host ''
Write-Host '==== ShambConkins LOCAL test runner ====' -ForegroundColor Cyan
Write-Host ("Mode: {0}" -f $Mode)
Write-Host ("Project: {0}" -f $Root)
Write-Host ("Reports: {0}" -f $ReportDir)
Write-Host 'Nothing is sent to GitHub Actions. First run may set up portable Node and Chromium locally.'
if ($Mode -eq 'Background') {
    Write-Host 'LOW-IMPACT: tests run sequentially, with pauses and memory safeguards.' -ForegroundColor Yellow
    $env:SHAMB_MIN_FREE_MEMORY_GB = '4'
    $env:SHAMB_GAME_COOLDOWN_MS = '2000'
    try {
        # Ask Windows not to sleep during this process, without editing power plans.
        # Closing the lid or shutting down can still interrupt the run.
        Add-Type -Namespace ShambConkins -Name PowerRequest -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern uint SetThreadExecutionState(uint esFlags);
'@ -ErrorAction Stop
        [void][ShambConkins.PowerRequest]::SetThreadExecutionState([uint32]2147483649)
        Write-Host 'Temporary keep-awake request active (screen may turn off normally).'
    } catch {
        Write-Host 'Could not request temporary keep-awake. Leave laptop plugged in and awake.' -ForegroundColor Yellow
    }
}
Write-Host ''

function Run-Step {
    param([string]$Label, [string]$Command, [string[]]$Arguments)
    $script:StepNumber++
    $safe = ($Label -replace '[^a-zA-Z0-9_-]','-')
    $log = Join-Path $ReportDir ("{0:D2}-{1}.log" -f $script:StepNumber, $safe)
    Write-Host ("[{0}] {1}" -f $script:StepNumber, $Label) -ForegroundColor Cyan
    @(
        'RUNNING - previous full report may be incomplete until this step finishes'
        ("Current step: {0}" -f $Label)
        ("Run folder: {0}" -f $ReportDir)
        ("Completed passes: {0}" -f $script:Passes.Count)
        ("Completed failures: {0}" -f $script:Failures.Count)
        ("Live log: {0}" -f $log)
    ) | Set-Content -LiteralPath (Join-Path $Root 'local-test-reports\LATEST-PROGRESS.txt') -Encoding UTF8
    $exitCode = 1
    try {
        $oldPref = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        & $Command @Arguments 2>&1 | Tee-Object -FilePath $log | Out-Host
        $exitCode = $LASTEXITCODE
        $ErrorActionPreference = $oldPref
        if ($null -eq $exitCode) { $exitCode = 1 }
    } catch {
        $_.ToString() | Out-File -FilePath $log -Append -Encoding UTF8
        Write-Host $_.ToString() -ForegroundColor Red
        $ErrorActionPreference = 'Stop'
        $exitCode = 1
    }
    if ($exitCode -eq 0) {
        [void]$script:Passes.Add($Label)
        @('Step finished: PASS', ("Step: {0}" -f $Label), ("Log: {0}" -f $log),
          ("Passed steps: {0}" -f $script:Passes.Count),
          ("Failed steps: {0}" -f $script:Failures.Count)) |
          Set-Content -LiteralPath (Join-Path $Root 'local-test-reports\LATEST-PROGRESS.txt') -Encoding UTF8
        Write-Host ("PASS: {0}" -f $Label) -ForegroundColor Green
        return $true
    }
    [void]$script:Failures.Add(("{0} (exit {1})" -f $Label, $exitCode))
    if (Test-Path -LiteralPath $log) {
        $tail = @(Get-Content -LiteralPath $log -Tail 18 -ErrorAction SilentlyContinue)
        [void]$script:FailureDetails.Add(("[{0}]" -f $Label) + [Environment]::NewLine + ($tail -join [Environment]::NewLine))
    }
    @('Step finished: FAIL', ("Step: {0}" -f $Label), ("Log: {0}" -f $log),
      ("Passed steps: {0}" -f $script:Passes.Count),
      ("Failed steps: {0}" -f $script:Failures.Count)) |
      Set-Content -LiteralPath (Join-Path $Root 'local-test-reports\LATEST-PROGRESS.txt') -Encoding UTF8
    Write-Host ("FAIL: {0} (exit {1})" -f $Label, $exitCode) -ForegroundColor Red
    return $false
}
function Finish {
    $summary = @(
        'ShambConkins local test report'
        ("Mode: {0}" -f $Mode)
        ("Project: {0}" -f $Root)
        ("Report folder: {0}" -f $ReportDir)
        ("Passed steps: {0}" -f $script:Passes.Count)
        ("Failed steps: {0}" -f $script:Failures.Count)
        ''
        'PASSED'
    ) + @($script:Passes) + @('','FAILED') + @($script:Failures)
    if ($script:Failures.Count -eq 0) { $summary += '(none)' }
    if ($script:Failures.Count -gt 0 -and $script:FailureDetails.Count -gt 0) {
        $summary += @('', 'ERROR DETAILS (last 18 lines from each failed step)')
        $summary += @($script:FailureDetails)
    }
    $summary | Set-Content -Path (Join-Path $ReportDir 'SUMMARY.txt') -Encoding UTF8
    $summary | Set-Content -Path (Join-Path $Root 'local-test-reports\LATEST-SUMMARY.txt') -Encoding UTF8
    Write-Host ''
    Write-Host ("Finished: {0} passed, {1} failed." -f $script:Passes.Count, $script:Failures.Count)
    Write-Host ("Report: {0}" -f (Join-Path $ReportDir 'SUMMARY.txt'))
    if ($Mode -eq 'Background') {
        try { [void][ShambConkins.PowerRequest]::SetThreadExecutionState([uint32]2147483648) } catch {}
        if ($null -ne $script:BackgroundMutex) {
            try { $script:BackgroundMutex.ReleaseMutex() } catch {}
            $script:BackgroundMutex.Dispose()
        }
    }
    if ($script:Failures.Count -gt 0) { Write-Host 'Open SUMMARY.txt or individual .log files to find the failing test.' -ForegroundColor Yellow; exit 1 }
    Write-Host 'All selected checks passed.' -ForegroundColor Green
    exit 0
}

# Resolve an existing Node + npm pair; if absent, bootstrap a private copy.
# This is per-process and never edits the machine-wide PATH or registry.
try {
    $resolver = Join-Path $PSScriptRoot 'resolve-node-for-local-tests.ps1'
    $tools = & $resolver -ProjectRoot $Root -NoSetup:$NoSetup
    if (-not $tools -or -not $tools.Node -or -not $tools.Npm) {
        throw 'Node resolver did not produce node.exe and npm.cmd.'
    }
    $nodeExe = $tools.Node
    $npmExe = $tools.Npm
    $env:PATH = $tools.Folder + [IO.Path]::PathSeparator + $env:PATH
    Write-Host ("Node.js {0}" -f $tools.Version)
    Write-Host ("Node location: {0}" -f $nodeExe)
} catch {
    [void]$script:Failures.Add(("Node.js setup: {0}" -f $_.Exception.Message))
    Finish
}
# Check for locally installed Playwright; never depend on GitHub-hosted /node-tools.
$localPlaywright = Join-Path $Root 'node_modules\playwright\package.json'
if (-not (Test-Path -LiteralPath $localPlaywright)) {
    if ($NoSetup) {
        [void]$script:Failures.Add('Playwright not installed. Rerun without -NoSetup to install it once.')
        Finish
    }
    if (-not (Run-Step 'Install-Playwright-once' $npmExe @('install','--no-save','--no-package-lock','--ignore-scripts','--no-audit','--no-fund','playwright@1.50.1'))) { Finish }
}
$chromium = ''
try { $chromium = (& $nodeExe -e "process.stdout.write(require('playwright').chromium.executablePath())").Trim() }
catch { $chromium = '' }
if (-not $chromium) {
    [void]$script:Failures.Add('Cannot locate Playwright Chromium executable metadata.')
    Finish
}
if (-not (Test-Path -LiteralPath $chromium)) {
    if ($NoSetup) {
        [void]$script:Failures.Add('Chromium not installed. Rerun without -NoSetup to install it once.')
        Finish
    }
    if (-not (Run-Step 'Download-local-Chromium-once' $nodeExe @('node_modules/playwright/cli.js','install','chromium'))) { Finish }
}
if (-not (Test-Path -LiteralPath $chromium)) {
    [void]$script:Failures.Add('Chromium download did not create the expected executable: ' + $chromium)
    Finish
}
$env:SHAMB_CHROMIUM = $chromium
$BrowserReady = $true
Write-Host ("Browser: {0}" -f $chromium)

# Required prerequisites: if module validation or build fails, don't produce fake
# browser passes from stale dist/ files.
if (-not (Run-Step 'Source-module-registry' $nodeExe @('tools/check-modules.mjs'))) { Finish }
if (-not (Run-Step 'Build-offline-game-HTML' $nodeExe @('tools/build.mjs'))) { Finish }
if (-not (Test-Path -LiteralPath $env:SHAMB_FILE)) {
    [void]$script:Failures.Add('Offline built game HTML is missing.')
    Finish
}

$unitTests = @(
    'tests/gopher-moods.mjs',
    'tests/fruit-swipe.mjs',
    'tests/taskmaster-relay.mjs',
    'tests/pkmn-bond-identity.mjs',
    'tests/trivia-regression.mjs',
    'tests/board.mjs',
    'tests/levelflow.mjs',
    'tests/unlocks.mjs'
)
foreach ($test in $unitTests) {
    [void](Run-Step ([IO.Path]::GetFileNameWithoutExtension($test)) $nodeExe @($test))
}
foreach ($test in @('tests/player-names.mjs', 'tests/pkmn-haptics.mjs', 'tests/smoke.mjs')) {
    [void](Run-Step ([IO.Path]::GetFileNameWithoutExtension($test)) $nodeExe @($test))
}
if ($Mode -eq 'Background' -and $script:Failures.Count -gt 0) {
    Write-Host 'Early test failures: skipping expensive browser fuzz; see report.' -ForegroundColor Yellow
    Finish
}
if ($Mode -eq 'Full' -or $Mode -eq 'Background') {
    [void](Run-Step 'Board-route-browser-flow' $nodeExe @('tests/route.mjs'))
    if ($Mode -eq 'Background' -and $script:Failures.Count -gt 0) {
        Write-Host 'Route test failed; skipping all-game fuzz.' -ForegroundColor Yellow
        Finish
    }
    # The old single 139-game run opened 3 huge Chromium contexts in parallel
    # and held one browser process for the entire catalog. On smaller Windows
    # laptops this can cause swap thrashing and prevent even Task Manager opening.
    # Test every game, but sequentially, in 12 independent browser batches.
    # Each batch exits to release all Chromium memory before the next starts.
    $fuzzShards = 12
    for ($shard = 0; $shard -lt $fuzzShards; $shard++) {
        $freeGB = $null
        try {
            $os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop
            $freeGB = [math]::Round(([double]$os.FreePhysicalMemory / 1048576), 1)
        } catch {
            Write-Host "Free RAM check unavailable; using one game at a time." -ForegroundColor Yellow
        }
        $minimumGB = if ($Mode -eq 'Background') { 4.0 } else { 3.0 }
        if ($null -ne $freeGB -and $freeGB -lt $minimumGB) {
            [void]$script:Failures.Add(("Low memory: only {0} GB free; stopped before browser fuzz shard {1}/12 (minimum {2} GB)." -f $freeGB, ($shard+1), $minimumGB))
            Write-Host ("Stopped safely: {0} GB free. Close memory-heavy apps before a future full run." -f $freeGB) -ForegroundColor Yellow
            Finish
        }
        Write-Host ("Browser game batch {0}/{1}, concurrency=1, 1 second/game, free RAM={2} GB" -f ($shard+1), $fuzzShards, $freeGB)
        $ok = Run-Step ("Minigames-{0:D2}-of-{1:D2}" -f ($shard+1),$fuzzShards) $nodeExe @('tests/games.mjs','1','1','.*',("$shard"),("$fuzzShards"))
        if ($Mode -eq 'Background') {
            if (-not $ok) {
                Write-Host 'Unattended run stopped after a failing browser batch to protect the laptop.' -ForegroundColor Yellow
                Finish
            }
            if ($shard -lt ($fuzzShards - 1)) {
                Write-Host 'Cooling down for 10 seconds before next browser batch.'
                Start-Sleep -Seconds 10
            }
        }
    }
    $focused = @(Get-ChildItem -LiteralPath (Join-Path $Root 'tests') -Filter 'broforce-*.mjs' -File -ErrorAction SilentlyContinue | Sort-Object Name)
    if ($focused.Count -gt 0) {
        Write-Host ("Detected {0} Broforce focused test files." -f $focused.Count)
        foreach ($item in $focused) {
            [void](Run-Step $item.BaseName $nodeExe @('tests/' + $item.Name))
        }
        $scenarios = Join-Path $Root 'tests\broforce-scenarios.mjs'
        if (Test-Path -LiteralPath $scenarios) {
            [void](Run-Step 'Broforce-integrated-scenarios' $nodeExe @('tests/broforce-scenarios.mjs','--integrated'))
        }
    }
    $bf41 = Join-Path $Root 'tests\bf41-broforce-browser-launch.mjs'
    if (Test-Path -LiteralPath $bf41) {
        [void](Run-Step 'Broforce-four-stage-real-browser-launch' $nodeExe @('tests/bf41-broforce-browser-launch.mjs'))
    }
    $bf59 = Join-Path $Root 'tests\bf59-broforce-viewport-capture.mjs'
    if (Test-Path -LiteralPath $bf59) {
        [void](Run-Step 'Broforce-Fold-and-mobile-screenshots' $nodeExe @('tests/bf59-broforce-viewport-capture.mjs','--file','dist/ShambConkins.html','--out',(Join-Path $ReportDir 'broforce-fold-screenshots')))
    }
}
Finish
