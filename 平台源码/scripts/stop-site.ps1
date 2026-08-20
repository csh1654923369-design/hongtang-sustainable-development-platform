param(
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"
$pidFile = Join-Path $env:TEMP "hongtang-platform-dev.pid"

if (-not (Test-Path -LiteralPath $pidFile)) {
  Write-Host "没有找到由“启动网站.bat”启动的后台服务。" -ForegroundColor Yellow
  Write-Host "如果你是在终端运行 npm run dev，请回到该终端按 Ctrl + C。"
  exit 0
}

$savedPid = (Get-Content -LiteralPath $pidFile -Raw).Trim()
if ($savedPid -notmatch "^\d+$") {
  Remove-Item -LiteralPath $pidFile -Force
  Write-Host "启动记录已损坏，现已清理。" -ForegroundColor Yellow
  exit 1
}

$process = Get-Process -Id ([int]$savedPid) -ErrorAction SilentlyContinue
if ($process) {
  & taskkill.exe /PID $process.Id /T /F | Out-Null
  Write-Host "网站服务已关闭。" -ForegroundColor Green
} else {
  Write-Host "网站服务已经停止。" -ForegroundColor Green
}

Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
