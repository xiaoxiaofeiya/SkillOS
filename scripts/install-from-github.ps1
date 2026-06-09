param(
  [string]$InstallDir = "",

  [ValidateSet("suggest", "approve", "auto")]
  [string]$Safety = "approve",

  [string]$Clients = "codex,claude-code,cursor,windsurf,openhands,openclaw",

  [switch]$NoLink,

  [switch]$SkipSetup
)

$ErrorActionPreference = "Stop"
$Repo = "https://github.com/xiaoxiaofeiya/SkillOS.git"

function Invoke-CheckedNative {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$FailureMessage
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FailureMessage (exit code $LASTEXITCODE)"
  }
}

if (-not $InstallDir) {
  if ($env:SKILLOS_INSTALL_DIR) {
    $InstallDir = $env:SKILLOS_INSTALL_DIR
  } else {
    $InstallDir = Join-Path $env:LOCALAPPDATA "SkillOS"
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is required for this installer. Install Git, or download the repository zip from GitHub."
}

if (-not (Test-Path $InstallDir)) {
  Invoke-CheckedNative "git" @("clone", $Repo, $InstallDir) "Failed to clone SkillOS from GitHub"
} elseif (Test-Path (Join-Path $InstallDir ".git")) {
  Push-Location $InstallDir
  try {
    Invoke-CheckedNative "git" @("pull", "--ff-only") "Failed to update SkillOS from GitHub"
  } finally {
    Pop-Location
  }
} else {
  throw "InstallDir exists but is not a git repository: $InstallDir"
}

$InstallScript = Join-Path $InstallDir "scripts\install.ps1"
$ArgsList = @("-ExecutionPolicy", "Bypass", "-File", $InstallScript, "-Safety", $Safety, "-Clients", $Clients)
if ($NoLink) { $ArgsList += "-NoLink" }
if ($SkipSetup) { $ArgsList += "-SkipSetup" }

Invoke-CheckedNative "powershell" $ArgsList "SkillOS install script failed"
