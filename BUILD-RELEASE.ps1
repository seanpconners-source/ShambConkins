# ShambConkins one-click local release compiler.
# Builds whatever branch is checked out (main, TESTver, ...) into releases/ without uploading or
# modifying game source. Names: main -> ShambConkins_v<ver>.html, TESTver -> ShambConkins_v<ver>_TestVer.html,
# other branches -> ShambConkins_v<ver>_<branch>.html. Existing files in releases/ are never replaced.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root
try {
    Write-Host ''
    Write-Host '========== SHAMBCONKINS RELEASE BUILDER ==========' -ForegroundColor Cyan
    Write-Host ('Repository: ' + $root)

    # Read the checked-out branch from .git/HEAD (GitHub Desktop clone: .git folder; worktree: .git file).
    $gitDir = Join-Path $root '.git'
    if (Test-Path -LiteralPath $gitDir -PathType Leaf) {
        $pointer = (Get-Content -LiteralPath $gitDir -Raw).Trim()
        if ($pointer -match '^gitdir:\s*(.+)$') { $gitDir = $Matches[1].Trim() }
        if (-not [System.IO.Path]::IsPathRooted($gitDir)) { $gitDir = Join-Path $root $gitDir }
    }
    $headFile = Join-Path $gitDir 'HEAD'
    if (-not (Test-Path -LiteralPath $headFile -PathType Leaf)) {
        throw 'Cannot read the checked-out branch (.git is missing). Open the repository in GitHub Desktop first.'
    }
    $head = (Get-Content -LiteralPath $headFile -Raw).Trim()
    if ($head -match '^ref:\s*refs/heads/(.+)$') {
        $branch = $Matches[1]
    } elseif ($head -match '^[0-9a-f]{7,}') {
        $branch = 'detached-' + $head.Substring(0, 7)
    } else {
        throw ('Cannot tell which branch is checked out (HEAD: {0}).' -f $head)
    }
    if ($branch -eq 'main') {
        $label = ''
    } elseif ($branch -eq 'TESTver') {
        $label = '_TestVer'
    } else {
        $label = '_' + (($branch -replace '[^A-Za-z0-9.-]+', '-').Trim('-'))
    }
    Write-Host ('Branch: ' + $branch)

    # Catch uncommitted source/art changes when the Git binary is available. A main release must be
    # clean; other branches build exactly what is on disk and just list the uncommitted files.
    $git = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($git) {
        $dirty = @(& $git.Source -C $root status --porcelain -- src assets package.json tools/build.mjs)
        if ($LASTEXITCODE -ne 0) { throw 'Git could not check whether the source is clean.' }
        if ($dirty.Count -gt 0) {
            if ($branch -eq 'main') {
                throw ('Uncommitted game/source/art changes detected. Commit or resolve them in GitHub Desktop before releasing: ' + ($dirty -join '; '))
            }
            Write-Host ('Note: building with uncommitted changes: ' + ($dirty -join '; ')) -ForegroundColor Yellow
        }
    } else {
        Write-Host ('Git is not on PATH; confirm GitHub Desktop has pulled the latest ' + $branch + '.') -ForegroundColor Yellow
    }

    $manifest = Join-Path $root 'package.json'
    $version = (Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json).version
    if ($version -notmatch '^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$') {
        throw ('Unexpected version in package.json: ' + $version)
    }
    $resolver = Join-Path $root 'tools\resolve-node-for-local-tests.ps1'
    if (-not (Test-Path -LiteralPath $resolver)) {
        throw ('Missing the existing Node resolver. Pull ' + $branch + ' in GitHub Desktop first.')
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
    $base = 'ShambConkins_v' + $version + $label
    $name = $base + '.html'
    $target = Join-Path $releaseDir $name
    if (Test-Path -LiteralPath $target) {
        $name = $base + '_built-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.html'
        $target = Join-Path $releaseDir $name
        Write-Host ('{0}.html already exists; keeping it and using a timestamped name.' -f $base) -ForegroundColor Yellow
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
