param(
  [ValidateSet("suggest", "approve", "auto")]
  [string]$Safety = "approve",

  [string]$Clients = "codex,claude-code,cursor,windsurf,openhands,openclaw",

  [switch]$NoLink,

  [switch]$SkipSetup
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Installer = Join-Path $ScriptDir "install-local.mjs"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 20 or newer is required. Install Node.js first, then rerun this script."
}

$ArgsList = @($Installer, "--safety", $Safety, "--clients", $Clients)
if ($NoLink) { $ArgsList += "--no-link" }
if ($SkipSetup) { $ArgsList += "--skip-setup" }

node @ArgsList
