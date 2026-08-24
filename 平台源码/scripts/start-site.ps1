param(
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $env:TEMP "hongtang-platform-dev.pid"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stdoutLog = Join-Path $env:TEMP "hongtang-platform-$timestamp.stdout.log"
$stderrLog = Join-Path $env:TEMP "hongtang-platform-$timestamp.stderr.log"

function Test-WebsiteReady {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Open-Website {
  if (-not $NoBrowser) {
    Start-Process "http://localhost:3000"
  }
}

Set-Location -LiteralPath $projectRoot

if (Test-WebsiteReady) {
  Write-Host "红塘村可持续发展平台已经在运行。" -ForegroundColor Green
  Write-Host "访问地址：http://localhost:3000"
  Open-Website
  exit 0
}

# 版本快照不复制本机密钥；若当前目录没有配置，则只在进程内复用项目根目录的本机配置。
$localEnvFile = Join-Path $projectRoot ".env.local"
if (-not (Test-Path -LiteralPath $localEnvFile)) {
  $workspaceRoot = Split-Path -Parent (Split-Path -Parent $projectRoot)
  $sharedEnvFile = Join-Path $workspaceRoot "平台源码\.env.local"
  if (Test-Path -LiteralPath $sharedEnvFile) {
    Get-Content -LiteralPath $sharedEnvFile -Encoding UTF8 | ForEach-Object {
      $line = $_.Trim()
      if ($line -and -not $line.StartsWith("#")) {
        $separator = $line.IndexOf("=")
        if ($separator -gt 0) {
          $name = $line.Substring(0, $separator).Trim()
          $value = $line.Substring($separator + 1).Trim()
          if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
          }
          if ($name -match "^[A-Za-z_][A-Za-z0-9_]*$") {
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
          }
        }
      }
    }
  }
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  Write-Host "没有找到 npm。请先安装 Node.js，或联系项目维护人员。" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
  Write-Host "第一次启动，正在安装运行依赖，请保持网络连接……" -ForegroundColor Yellow
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "项目依赖安装失败。请检查网络连接后重新双击启动网站。" -ForegroundColor Red
    exit 1
  }
}

Write-Host "正在启动红塘村可持续发展平台，请稍候……"
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = "cmd.exe"
$startInfo.Arguments = "/d /c npm.cmd run dev 1>`"$stdoutLog`" 2>`"$stderrLog`""
$startInfo.WorkingDirectory = $projectRoot
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden

# PowerShell 5.1 的 Start-Process 会在部分环境同时存在 Path/PATH 时抛出重复键错误。
# 直接使用 ProcessStartInfo 可以原样继承环境变量，并继续保持后台隐藏运行和日志重定向。
$process = New-Object System.Diagnostics.Process
$process.StartInfo = $startInfo
$null = $process.Start()

Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ascii

for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
  Start-Sleep -Milliseconds 500
  if (Test-WebsiteReady) {
    Write-Host "网站已启动：http://localhost:3000" -ForegroundColor Green
    Open-Website
    exit 0
  }
  if ($process.HasExited) {
    break
  }
}

Write-Host "网站未能正常启动。" -ForegroundColor Red
if (Test-Path -LiteralPath $stderrLog) {
  Get-Content -LiteralPath $stderrLog -Tail 20
}
if (-not $process.HasExited) {
  & taskkill.exe /PID $process.Id /T /F | Out-Null
}
Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
Write-Host "运行日志：$stdoutLog"
Write-Host "错误日志：$stderrLog"
exit 1
