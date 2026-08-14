[CmdletBinding()]
param(
	[string[]]$Probe = @("all"),
	[string[]]$Scenario = @(),
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

$catalog = [ordered]@{
	content = "res://scripts/debug/content_validation_probe.gd"
	rules = "res://scripts/debug/sdk_encounter_harness.gd"
	legality = "res://scripts/debug/legality_probe.gd"
	engine_seam = "res://scripts/debug/engine_seam_probe.gd"
	action_stream = "res://scripts/debug/action_stream_probe.gd"
	board_authority = "res://scripts/debug/board_authority_probe.gd"
	parity = "res://scripts/debug/live_sdk_parity_probe.gd"
	boss_beats = "res://scripts/debug/boss_beat_probe.gd"
	target_patterns = "res://scripts/debug/target_pattern_resolver_probe.gd"
	target_bound_patterns = "res://scripts/debug/target_bound_pattern_probe.gd"
	encounter = "res://scripts/debug/new_player_spike.gd"
	layout = "res://scripts/debug/layout_probe.gd"
	mobile = "res://scripts/debug/mobile_hud_probe.gd"
	accessibility = "res://scripts/debug/accessibility_probe.gd"
	replay = "res://scripts/debug/full_charge_cleanup_probe.gd"
	focused_end_of_clock = "res://scripts/debug/focused_end_of_clock_probe.gd"
	records = "res://scripts/debug/encounter_record_probe.gd"
	record_scene = "res://scripts/debug/encounter_record_scene_probe.gd"
	presentation = "res://scripts/debug/card_action_board_presentation_probe.gd"
	riposte = "res://scripts/debug/riposte_ready_probe.gd"
	riposte_live = "res://scripts/debug/riposte_production_path_probe.gd"
	riposte_ui = "res://scripts/debug/riposte_status_ui_probe.gd"
	deck_eval_report = "res://scripts/debug/deck_eval_report_probe.gd"
	controlled_deck_eval_report = "res://scripts/debug/controlled_deck_eval_report_probe.gd"
	starter_deck_promotion = "res://scripts/debug/starter_deck_promotion_probe.gd"
}

$scenarioCatalog = [ordered]@{
	full_charge_cleanup = "res://scripts/debug/full_charge_cleanup_probe.gd"
	whelp_clear = "res://scripts/debug/whelp_clear_probe.gd"
	slow_top_card_cleanup = "res://scripts/debug/slow_top_card_cleanup_probe.gd"
	deck_eval_baseline = "res://scripts/debug/deck_eval_baseline_probe.gd"
	controlled_deck_eval = "res://scripts/debug/controlled_deck_eval_probe.gd"
}

$requested = @($Probe | ForEach-Object { $_ -split "," } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$requestedScenarios = @($Scenario | ForEach-Object { $_ -split "," } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$unknown = @($requested | Where-Object { $_ -ne "all" -and -not $catalog.Contains($_) })
if ($unknown.Count -gt 0) {
	throw "Unknown Probe name(s): $($unknown -join ', '). Valid names: all, $($catalog.Keys -join ', ')."
}

if ($requestedScenarios.Count -gt 0 -and $requested.Count -eq 1 -and $requested[0] -eq "all") {
	$selected = @()
} elseif ($requested -contains "all") {
	$selected = @($catalog.Keys)
} else {
	$selected = @($requested | Select-Object -Unique)
}

$unknownScenarios = @($requestedScenarios | Where-Object { -not $scenarioCatalog.Contains($_) })
if ($unknownScenarios.Count -gt 0) {
	throw "Unknown Scenario ID(s): $($unknownScenarios -join ', '). Valid IDs: $($scenarioCatalog.Keys -join ', ')."
}
foreach ($scenarioId in $requestedScenarios) {
	$scenarioScript = $scenarioCatalog[$scenarioId]
	if ($selected -notcontains $scenarioScript) {
		$selected += $scenarioScript
	}
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$failures = [System.Collections.Generic.List[string]]::new()

foreach ($name in $selected) {
	if ($catalog.Contains($name)) {
		$probeScript = $catalog[$name]
		$label = $name
	} else {
		$probeScript = $name
		$scenarioLabel = $requestedScenarios | Where-Object { $scenarioCatalog[$_] -eq $probeScript } | Select-Object -First 1
		$label = "scenario:$scenarioLabel"
	}
	Write-Host "==> $label ($probeScript)"
	$previousErrorActionPreference = $ErrorActionPreference
	$ErrorActionPreference = "Continue"
	# Godot interprets --quit-after as rendered frames, not seconds. At 60 FPS,
	# 900 frames provides the intended 15-second safety ceiling.
	$probeOutput = (& $Godot --headless --path $repoRoot --script $probeScript --quit-after 900 2>&1 | Out-String)
	$ErrorActionPreference = $previousErrorActionPreference
	Write-Host $probeOutput
	if ($LASTEXITCODE -ne 0 -or $probeOutput -match "(SCRIPT ERROR:|(?m)^ERROR:|Assertion failed)") {
		$failures.Add($name)
	}
}

if ($failures.Count -gt 0) {
	throw "Probe suite failed: $($failures -join ', ')"
}

Write-Host "PROBE_SUITE_OK count=$($selected.Count)"
