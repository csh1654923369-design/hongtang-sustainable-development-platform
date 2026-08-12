[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$baseDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$partsDirectory = Join-Path $baseDirectory "Production_1-tif_DSM_merge.tif.parts"
$outputPath = Join-Path $baseDirectory "Production_1-tif_DSM_merge.tif"
$checksumPath = Join-Path $baseDirectory "Production_1-tif_DSM_merge.tif.sha256"

if (-not (Test-Path -LiteralPath $partsDirectory)) {
    throw "没有找到 DSM 分卷目录：$partsDirectory"
}

if ((Test-Path -LiteralPath $outputPath) -and -not $Force) {
    throw "目标文件已经存在。如需覆盖，请使用 -Force。"
}

$parts = Get-ChildItem -LiteralPath $partsDirectory -File -Filter "*.part*" | Sort-Object Name
if ($parts.Count -eq 0) {
    throw "没有找到 DSM 分卷文件。"
}

$temporaryPath = "$outputPath.tmp"
if (Test-Path -LiteralPath $temporaryPath) {
    Remove-Item -LiteralPath $temporaryPath -Force
}

$output = [System.IO.File]::Open(
    $temporaryPath,
    [System.IO.FileMode]::CreateNew,
    [System.IO.FileAccess]::Write,
    [System.IO.FileShare]::None
)

try {
    foreach ($part in $parts) {
        Write-Host "正在合并 $($part.Name)…"
        $input = [System.IO.File]::OpenRead($part.FullName)
        try {
            $input.CopyTo($output)
        }
        finally {
            $input.Dispose()
        }
    }
}
finally {
    $output.Dispose()
}

if (Test-Path -LiteralPath $outputPath) {
    Remove-Item -LiteralPath $outputPath -Force
}
Move-Item -LiteralPath $temporaryPath -Destination $outputPath

if (Test-Path -LiteralPath $checksumPath) {
    $expected = (Get-Content -LiteralPath $checksumPath -Raw).Trim().Split(" ")[0].ToUpperInvariant()
    $actual = (Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($actual -ne $expected) {
        throw "DSM 校验失败。预期 $expected，实际 $actual。"
    }
    Write-Host "DSM 合并完成，SHA256 校验通过。"
}
else {
    Write-Warning "DSM 合并完成，但未找到 SHA256 校验文件。"
}
