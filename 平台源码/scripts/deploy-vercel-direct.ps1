param(
  [switch]$PrepareOnly
)

$ErrorActionPreference = "Stop"
$sourceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$projectLink = Join-Path $sourceRoot ".vercel\project.json"

if (-not (Test-Path -LiteralPath $projectLink)) {
  Write-Host "尚未关联 Vercel 项目，正在启动关联向导……" -ForegroundColor Yellow
  Push-Location $sourceRoot
  try {
    npx --yes vercel@latest link --yes --project hongtang-sdg-platform
    if ($LASTEXITCODE -ne 0) { throw "Vercel 项目关联失败。" }
  } finally {
    Pop-Location
  }
}

$tempRoot = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd("\")
$deployRoot = Join-Path $tempRoot "hongtang-vercel-direct"
if (-not $deployRoot.StartsWith($tempRoot + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "临时发布目录不安全，已停止。"
}
if (Test-Path -LiteralPath $deployRoot) {
  Remove-Item -LiteralPath $deployRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $deployRoot -Force | Out-Null

& robocopy $sourceRoot $deployRoot /E /R:1 /W:1 /XD ".git" ".github" ".vercel" "node_modules" ".next" ".qa" ".deploy-source-repo" ".deploy-static" "local-photos" "vendor" "docs" ".agents" ".codex" ".branches" ".temp" /XF ".env*" "*.log" | Out-Null
if ($LASTEXITCODE -gt 7) { throw "整理发布文件失败，Robocopy 代码：$LASTEXITCODE" }
New-Item -ItemType Directory -Path (Join-Path $deployRoot ".vercel") -Force | Out-Null
Copy-Item -LiteralPath $projectLink -Destination (Join-Path $deployRoot ".vercel\project.json") -Force

$fileCount = @(Get-ChildItem -LiteralPath $deployRoot -Recurse -File -Force).Count
$sizeBytes = (Get-ChildItem -LiteralPath $deployRoot -Recurse -File -Force | Measure-Object Length -Sum).Sum
Write-Host ("已准备发布包：{0} 个文件，{1:N1} MB" -f $fileCount, ($sizeBytes / 1MB)) -ForegroundColor Cyan

if ($PrepareOnly) {
  Write-Host "仅检查发布包，未上传。" -ForegroundColor Green
  exit 0
}

Push-Location $deployRoot
try {
  npx --yes vercel@latest deploy --prod --yes --archive=tgz --no-wait
  if ($LASTEXITCODE -ne 0) { throw "Vercel 上传失败。" }
} finally {
  Pop-Location
}

Write-Host "发布请求已提交。通常几十秒后可访问：" -ForegroundColor Green
Write-Host "https://hongtang-sdg-platform.vercel.app" -ForegroundColor White
Write-Host "如 3D 不显示，请检查 Cesium 令牌是否允许该域名并包含资产 5139056。" -ForegroundColor Yellow
