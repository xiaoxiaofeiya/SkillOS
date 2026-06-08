param(
  [string]$InstallDir = "$env:LOCALAPPDATA\SkillOS",

  [ValidateSet("suggest", "approve", "auto")]
  [string]$Safety = "approve",

  [string]$Clients = "codex,claude-code,cursor,windsurf,openhands,openclaw",

  [switch]$NoLink,

  [switch]$SkipSetup
)

$ErrorActionPreference = "Stop"
$Repo = "https://github.com/xiaoxiaofeiya/SkillOS.git"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is required for this installer. Install Git, or download the repository zip from GitHub."
}

if (-not (Test-Path $InstallDir)) {
  git clone $Repo $InstallDir
} elseif (Test-Path (Join-Path $InstallDir ".git")) {
  Push-Location $InstallDir
  git pull --ff-only
  Pop-Location
} else {
  throw "InstallDir exists but is not a git repository: $InstallDir"
}

$InstallScript = Join-Path $InstallDir "scripts\install.ps1"
$ArgsList = @("-ExecutionPolicy", "Bypass", "-File", $InstallScript, "-Safety", $Safety, "-Clients", $Clients)
if ($NoLink) { $ArgsList += "-NoLink" }
if ($SkipSetup) { $ArgsList += "-SkipSetup" }

powershell @ArgsList
