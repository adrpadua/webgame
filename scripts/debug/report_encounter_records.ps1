[CmdletBinding()]
param(
	[string]$Godot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Godot)) {
	$godotCommand = Get-Command godot,godot4 -ErrorAction SilentlyContinue | Select-Object -First 1
	if ($null -ne $godotCommand) {
		$Godot = $godotCommand.Source
	} elseif (-not [string]::IsNullOrWhiteSpace($env:GODOT)) {
		$Godot = $env:GODOT
	} else {
		$wingetGodotRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe"
		$Godot = Get-ChildItem $wingetGodotRoot -Recurse -Filter "Godot*_console.exe" -ErrorAction SilentlyContinue |
			Select-Object -First 1 -ExpandProperty FullName
	}
}

if ([string]::IsNullOrWhiteSpace($Godot) -or -not (Test-Path $Godot -PathType Leaf)) {
	throw "Godot console executable was not found. Add godot to PATH, set GODOT, or pass -Godot <path>."
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
& $Godot --headless --path $repoRoot --script res://scripts/debug/encounter_record_report.gd --quit-after 15
if ($LASTEXITCODE -ne 0) {
	throw "Encounter Record report failed."
}
