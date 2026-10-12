# Find Node + npm on Windows or set up a verified private portable copy.
# No registry, machine PATH, admin rights, GitHub Actions, or global installs.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ProjectRoot, [switch]$NoSetup)
$ErrorActionPreference = 'Stop'
function Tested-NodeFolder {
    param([string]$Folder)
    if (-not $Folder) { return $null }
    $exe = Join-Path $Folder 'node.exe'
    $npm = Join-Path $Folder 'npm.cmd'
    if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { return $null }
    if (-not (Test-Path -LiteralPath $npm -PathType Leaf)) { return $null }
    try {
        $ver = (& $exe '--version' 2>$null | Out-String).Trim()
        if ($LASTEXITCODE -ne 0 -or $ver -notmatch '^v(\d+)\.') { return $null }
        if ([int]$Matches[1] -lt 20) { return $null }
        return [pscustomobject]@{ Node=$exe; Npm=$npm; Version=$ver; Folder=$Folder }
    } catch { return $null }
}
$candidates = New-Object 'System.Collections.Generic.List[string]'
$pathNode = Get-Command node.exe -ErrorAction SilentlyContinue
if ($pathNode -and $pathNode.Source) {
    [void]$candidates.Add((Split-Path -Parent $pathNode.Source))
}
$cacheParent = Join-Path $env:LOCALAPPDATA 'ShambConkins\TestTools'
$portable = Join-Path $cacheParent 'node'
[void]$candidates.Add($portable)
foreach ($root in @($env:ProgramFiles, [Environment]::GetEnvironmentVariable('ProgramFiles(x86)'), $env:LOCALAPPDATA, $env:USERPROFILE)) {
    if ($root) {
        [void]$candidates.Add((Join-Path $root 'nodejs'))
        [void]$candidates.Add((Join-Path $root 'Programs\nodejs'))
    }
}
if ($env:NVM_HOME) { [void]$candidates.Add($env:NVM_HOME) }
if ($env:NVM_SYMLINK) { [void]$candidates.Add($env:NVM_SYMLINK) }
# Previous portable Node distributions may be in Downloads or Desktop.
foreach ($folder in @((Join-Path $env:USERPROFILE 'Downloads'), (Join-Path $env:USERPROFILE 'Desktop'))) {
    if (-not (Test-Path -LiteralPath $folder -PathType Container)) { continue }
    [void]$candidates.Add($folder)
    foreach ($sub in @(Get-ChildItem -LiteralPath $folder -Directory -ErrorAction SilentlyContinue |
                       Where-Object { $_.Name -match '^(node|nodejs|node-v\d+)' })) {
        [void]$candidates.Add($sub.FullName)
        foreach ($nested in @(Get-ChildItem -LiteralPath $sub.FullName -Directory -ErrorAction SilentlyContinue |
                               Where-Object { $_.Name -match '^node' })) {
            [void]$candidates.Add($nested.FullName)
        }
    }
}
foreach ($folder in ($candidates | Select-Object -Unique)) {
    $found = Tested-NodeFolder $folder
    if ($found) {
        Write-Host ("Using Node.js {0} from {1}" -f $found.Version, $folder)
        return $found
    }
}
if ($NoSetup) {
    throw 'Could not locate Node.js 20+ with npm. Rerun the regular double-click launcher to set up a local copy.'
}
Write-Host 'Node.js was not found. Setting up a private portable copy (one-time, free).' -ForegroundColor Yellow
$baseUrl = 'https://nodejs.org/download/release/latest-v24.x'
$archiveName = $null
$expectedSha = $null
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $checksumText = (Invoke-WebRequest -Uri ($baseUrl + '/SHASUMS256.txt') -UseBasicParsing -TimeoutSec 45).Content
    if ($checksumText -is [byte[]]) { $checksumText = [Text.Encoding]::UTF8.GetString($checksumText) }
    foreach ($line in ($checksumText -split [char]10)) {
        if ($line.Trim() -match '^([a-fA-F0-9]{64})\s+(node-v24\.\d+\.\d+-win-x64\.zip)$') {
            $expectedSha = $Matches[1].ToLowerInvariant()
            $archiveName = $Matches[2]
            break
        }
    }
    if (-not $archiveName) { throw 'Official Node.js SHA256 list did not include the Windows x64 ZIP.' }
    New-Item -ItemType Directory -Path $cacheParent -Force | Out-Null
    $stage = Join-Path $cacheParent ('download-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $stage -Force | Out-Null
    try {
        $archive = Join-Path $stage $archiveName
        Write-Host ("Downloading {0} from nodejs.org..." -f $archiveName)
        Invoke-WebRequest -Uri ($baseUrl + '/' + $archiveName) -OutFile $archive -UseBasicParsing -TimeoutSec 300
        $actualSha = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualSha -ne $expectedSha) { throw 'Node.js ZIP checksum mismatch. Refusing to install.' }
        Write-Host 'Node.js SHA256 verified against official manifest.'
        $expanded = Join-Path $stage 'expanded'
        Expand-Archive -LiteralPath $archive -DestinationPath $expanded -Force
        $inner = Join-Path $expanded ($archiveName -replace '\.zip$', '')
        if (-not (Test-Path -LiteralPath (Join-Path $inner 'node.exe'))) { throw 'Expected node.exe not in verified ZIP.' }
        if (-not (Test-Path -LiteralPath (Join-Path $inner 'npm.cmd'))) { throw 'Expected npm.cmd not in verified ZIP.' }
        if (Test-Path -LiteralPath $portable) {
            $reuse = Tested-NodeFolder $portable
            if ($reuse) { return $reuse }
            throw 'An incomplete local Node folder already exists. Refusing to overwrite it.'
        }
        Move-Item -LiteralPath $inner -Destination $portable
    } finally {
        if ($stage -and (Test-Path -LiteralPath $stage)) {
            Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    $installed = Tested-NodeFolder $portable
    if (-not $installed) { throw 'Portable Node setup failed verification.' }
    Write-Host ("Ready: {0}. Windows settings unchanged." -f $installed.Version) -ForegroundColor Green
    return $installed
} catch {
    throw ("Node auto-setup failed: {0}. Check access to nodejs.org or supply Node.js with npm." -f $_.Exception.Message)
}
