# ShambConkins one-click local release compiler.
# Builds the checked-out main branch into releases/ without uploading or modifying game source.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root
try {
    Write-Host ''
    Write-Host '========== SHAMBCONKINS RELEASE BUILDER ==========' -ForegroundColor Cyan
    Write-Host ('Repository: ' + $root)

    # GitHub Desktop's normal clone uses a .git directory. Refuse to release
    # from a non-main checkout rather than accidentally packaging Broforce WIP.
    $gitDir = Join-Path $root '.git'
    if (-not (Test-Path -LiteralPath $gitDir -PathType Container)) {
        throw 'Cannot verify the repository branch (.git directory missing). Open the main checkout in GitHub Desktop.'
    }
    $headFile = Join-Path $gitDir 'HEAD'
    $head = (Get-Content -LiteralPath $headFile -Raw).Trim()
    if ($head -ne 'ref: refs/heads/main') {
        throw ("This checkout is not on main (HEAD: {0}). Switch to main in GitHub Desktop and retry." -f $head)
    }

    # Catch uncommitted source/art changes when the Git binary is available.
    $git = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($git) {
        $dirty = @(& $git.Source -C $root status --porcelain -- src assets package.json tools/build.mjs)
        if ($LASTEXITCODE -ne 0) { throw 'Git could not check whether the main source is clean.' }
        if ($dirty.Count -gt 0) {
            throw ('Uncommitted game/source/art changes detected. Commit or resolve them in GitHub Desktop before releasing: ' + ($dirty -join '; '))
        }
    } else {
        Write-Host 'Git is not on PATH; confirm GitHub Desktop has pulled the latest main.' -ForegroundColor Yellow
    }

    $manifest = Join-Path $root 'package.json'
    $version = (Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json).version
    if ($version -notmatch '^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$') {
        throw ('Unexpected version in package.json: ' + $version)
    }
    $resolver = Join-Path $root 'tools\resolve-node-for-local-tests.ps1'
    if (-not (Test-Path -LiteralPath $resolver)) {
        throw 'Missing the existing Node resolver. Pull main in GitHub Desktop first.'
    }
    # Do not perform surprise software downloads during a release build.
    $nodeInfo = & $resolver -ProjectRoot $root -NoSetup
    if (-not $nodeInfo -or -not $nodeInfo.Node) {
        throw 'Could not locate Node.js. Run the existing local test launcher once to complete its setup.'
    }
    $node = $nodeInfo.Node
    Write-Host ("Node: {0}" -f $node)
    Write-Host ("Version: {0}" -f $version)

    $releaseDir = Join-Path $root 'releases'
    if (-not (Test-Path -LiteralPath $releaseDir)) {
        New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
    }
    $name = 'ShambConkins_v' + $version + '.html'
    $target = Join-Path $releaseDir $name
    if (Test-Path -LiteralPath $target) {
        $name = 'ShambConkins_v' + $version + '_built-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.html'
        $target = Join-Path $releaseDir $name
        Write-Host 'Existing version found. Using a timestamped name to preserve it.' -ForegroundColor Yellow
    }

    Write-Host 'Checking game module registry...'
    & $node (Join-Path $root 'tools\check-modules.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Module check failed; release HTML not built.' }
    Write-Host 'Building self-contained offline HTML (this can take a little while)...'
    & $node (Join-Path $root 'tools\build.mjs') '--out' $target
    if ($LASTEXITCODE -ne 0) { throw ('HTML build failed with code ' + $LASTEXITCODE) }
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw 'Build claimed success but output HTML is missing.' }

    $size = (Get-Item -LiteralPath $target).Length
    if ($size -le 0) { throw 'The built HTML file is empty.' }
    Write-Host ''
    Write-Host 'RELEASE BUILD SUCCESSFUL' -ForegroundColor Green
    Write-Host ('Output: ' + $target) -ForegroundColor Green
    Write-Host ('Size: ' + ([math]::Round(($size / 1MB), 1)) + ' MB')
    Write-Host 'This is LOCAL only. Nothing was pushed or committed to GitHub.'
    if ($size -gt 100MB) {
        Write-Host 'WARNING: This file is over GitHub''s 100 MB single-file limit.' -ForegroundColor Yellow
        Write-Host 'Do not commit it as a regular Git blob; use a GitHub Release asset instead.' -ForegroundColor Yellow
    }
    exit 0
} catch {
    Write-Host ''
    Write-Host ('RELEASE BUILD FAILED: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
