# Manifest-driven Probe suite runner — PowerShell adapter (ADR 0018).
#
# Registration lives in scripts/debug/probes.manifest (lane|name|script|marker).
# A probe passes only when Godot exits 0, its output contains the declared
# marker, and no engine error or failed assertion appears. Runs the `default`
# and `scenario` lanes unless -Probe names are given; `manual` and `tool`
# lanes are reported as skipped, never silently dropped.
[CmdletBinding()]
param(
	[string[]]$Probe = @(),
	[string]$Godot = "",
	[string]$Manifest = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
if ([string]::IsNullOrWhiteSpace($Manifest)) {
	$Manifest = Join-Path $repoRoot "scripts/debug/probes.manifest"
}

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
if (-not (Test-Path $Manifest -PathType Leaf)) {
	throw "Probe manifest not found: $Manifest"
}

$requested = @($Probe | ForEach-Object { $_ -split "," } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$pass = 0
$fail = 0
$failedNames = @()
$skipped = @()

foreach ($line in Get-Content $Manifest) {
	$trimmed = $line.Trim()
	if ($trimmed -eq "" -or $trimmed.StartsWith("#")) {
		continue
	}
	$fields = $trimmed -split "\|"
	if ($fields.Count -ne 4) {
		throw "Malformed manifest line: $trimmed"
	}
	$lane = $fields[0].Trim(); $name = $fields[1].Trim(); $script = $fields[2].Trim(); $marker = $fields[3].Trim()
	if ($requested.Count -gt 0) {
		if ($requested -notcontains $name) {
			continue
		}
	} elseif ($lane -notin @("default", "scenario")) {
		$skipped += "$name($lane)"
		continue
	}
	# --quit-after counts rendered frames (~900 frames ≈ 15s at 60 FPS) as a
	# runaway ceiling; headless frame pacing may differ.
	$probeOutput = & $Godot --headless --path $repoRoot --script $script --quit-after 900 2>&1 | Out-String
	$verdict = "ok"
	if ($LASTEXITCODE -ne 0) {
		$verdict = "FAIL(exit=$LASTEXITCODE)"
	} elseif ($probeOutput -match "(SCRIPT ERROR:|(?m)^ERROR:|Assertion failed)") {
		$verdict = "FAIL(errors)"
	} elseif ($marker -ne "" -and -not $probeOutput.Contains($marker)) {
		$verdict = "FAIL(missing marker $marker)"
	}
	if ($verdict -eq "ok") {
		$pass += 1
		Write-Host "ok   [$name] $marker"
	} else {
		$fail += 1
		$failedNames += $name
		Write-Host "FAIL [$name] $verdict"
		($probeOutput -split "`n" | Where-Object { $_ -match "SCRIPT ERROR:|^ERROR:|Assertion failed" } | Select-Object -First 6) | ForEach-Object { Write-Host "     $_" }
	}
}

if ($skipped.Count -gt 0) {
	Write-Host "skipped lanes: $($skipped -join ' ')"
}
if ($fail -gt 0) {
	Write-Host "PROBE_SUITE_FAILED pass=$pass fail=$fail failed: $($failedNames -join ' ')"
	exit 1
}
if ($pass -eq 0) {
	Write-Host "PROBE_SUITE_FAILED no probes matched the request"
	exit 1
}
Write-Host "PROBE_SUITE_OK count=$pass"
