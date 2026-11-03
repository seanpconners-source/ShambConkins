# ShambConkins soak test launcher for the Windows laptop (ROADMAP Q00). Run SOAK-TEST.cmd.
# Finds Node (or sets up a private copy), installs Playwright + Chromium once, then runs tools/soak.mjs until the window
# is closed. Reports: soak-reports\LATEST.md. Nothing is uploaded; no GitHub Actions minutes are used.
[CmdletBinding()]
param([double]$Hours = 0, [switch]$NoOnline, [switch]$NoBuild)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $Root
Write-Host ''
Write-Host '==== ShambConkins SOAK TEST ====' -ForegroundColor Cyan
Write-Host 'Plays the long tests over and over. Leave it running; close this window to stop.'
Write-Host 'Report: soak-reports\LATEST.md (updated after every test).'
Write-Host ''
# Keep the laptop awake while this window is open (the screen may still turn off).
try {
    Add-Type -Namespace ShambConkinsSoak -Name PowerRequest -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern uint SetThreadExecutionState(uint esFlags);
'@ -ErrorAction Stop
    [void][ShambConkinsSoak.PowerRequest]::SetThreadExecutionState([uint32]2147483649)
    Write-Host 'Keep-awake on. Leave the laptop plugged in with the lid open.' -ForegroundColor Yellow
} catch { Write-Host 'Could not ask Windows to stay awake: keep the laptop plugged in and awake.' -ForegroundColor Yellow }

$tools = & (Join-Path $PSScriptRoot 'resolve-node-for-local-tests.ps1') -ProjectRoot $Root
if (-not $tools -or -not $tools.Node) { Write-Host 'Node.js could not be found or set up.' -ForegroundColor Red; exit 1 }
$env:PATH = $tools.Folder + [IO.Path]::PathSeparator + $env:PATH
Write-Host ("Node.js {0}" -f $tools.Version)
if (-not (Test-Path -LiteralPath (Join-Path $Root 'node_modules\playwright\package.json'))) {
    Write-Host 'Installing Playwright (once) ...'
    & $tools.Npm install --no-save --no-package-lock --ignore-scripts --no-audit --no-fund playwright@1.50.1
}
$chromium = (& $tools.Node -e "process.stdout.write(require('playwright').chromium.executablePath())").Trim()
if (-not (Test-Path -LiteralPath $chromium)) {
    Write-Host 'Downloading Chromium for the tests (once) ...'
    & $tools.Node node_modules/playwright/cli.js install chromium
}
$env:SHAMB_CHROMIUM = $chromium
$soakArgs = @('tools/soak.mjs')
if ($Hours -gt 0) { $soakArgs += @('--hours', "$Hours") }
if ($NoOnline) { $soakArgs += '--no-online' }
if ($NoBuild) { $soakArgs += '--no-build' }
& $tools.Node @soakArgs
try { [void][ShambConkinsSoak.PowerRequest]::SetThreadExecutionState([uint32]2147483648) } catch {}
