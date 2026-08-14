param(
    [string]$Root = ".\docs\artifacts\handoff-packets"
)

$ErrorActionPreference = "Stop"

$resolvedRoot = $Root
if (-not [System.IO.Path]::IsPathRooted($resolvedRoot)) {
    $resolvedRoot = Join-Path (Get-Location) $resolvedRoot
}

$errors = New-Object System.Collections.Generic.List[object]
$handoffCount = 0

function Add-ValidationError {
    param(
        [string]$Code,
        [string]$Handoff,
        [string]$Path,
        [string]$Message
    )
    $script:errors.Add([pscustomobject]@{
        code = $Code
        handoff = $Handoff
        path = $Path
        message = $Message
    }) | Out-Null
}

function Has-Field {
    param($Object, [string]$Name)
    if ($null -eq $Object) {
        return $false
    }
    return ($Object.PSObject.Properties.Name -contains $Name)
}

function Get-Field {
    param($Object, [string]$Name, $Default = $null)
    if (Has-Field $Object $Name) {
        return $Object.$Name
    }
    return $Default
}

function Get-ArrayCount {
    param($Value)
    if ($null -eq $Value) {
        return 0
    }
    if ($Value -is [System.Array]) {
        return $Value.Count
    }
    return 1
}

function Read-Packet {
    param([string]$Path, [string]$Handoff, [string]$PacketName)
    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }
    try {
        return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    }
    catch {
        Add-ValidationError "invalid-state" $Handoff $Path "$PacketName is not valid JSON: $($_.Exception.Message)"
        return $null
    }
}

function Validate-RequiredFields {
    param($Packet, [string[]]$Fields, [string]$Handoff, [string]$Path)
    if ($null -eq $Packet) {
        return
    }
    foreach ($field in $Fields) {
        if (-not (Has-Field $Packet $field)) {
            Add-ValidationError "missing-field" $Handoff $Path "Missing required field '$field'."
        }
    }
}

function Validate-PacketIdentity {
    param($Packet, [string]$ExpectedType, [string]$ExpectedState, [string[]]$AllowedStates, [string]$Handoff, [string]$Path)
    if ($null -eq $Packet) {
        return
    }
    if ((Get-Field $Packet "schema_version") -ne 1) {
        Add-ValidationError "invalid-state" $Handoff $Path "schema_version must be 1."
    }
    if ((Get-Field $Packet "packet_type") -ne $ExpectedType) {
        Add-ValidationError "invalid-state" $Handoff $Path "packet_type must be '$ExpectedType'."
    }
    $state = Get-Field $Packet "state"
    if ($AllowedStates.Count -gt 0) {
        if ($AllowedStates -notcontains $state) {
            Add-ValidationError "invalid-state" $Handoff $Path "state '$state' is not one of: $($AllowedStates -join ', ')."
        }
    }
    elseif ($state -ne $ExpectedState) {
        Add-ValidationError "invalid-state" $Handoff $Path "state must be '$ExpectedState'."
    }
    if ((Get-Field $Packet "handoff_id") -ne $Handoff) {
        Add-ValidationError "invalid-state" $Handoff $Path "handoff_id must match directory name '$Handoff'."
    }
}

function Validate-Supersession {
    param($Packet, [string]$Handoff, [string]$Path)
    if ($null -eq $Packet) {
        return
    }
    Validate-RequiredFields $Packet @(
        "schema_version", "packet_type", "handoff_id", "revision", "state", "writer_role",
        "created_at", "supersedes", "active_revision", "reason"
    ) $Handoff $Path
    if ((Get-Field $Packet "schema_version") -ne 1) {
        Add-ValidationError "invalid-state" $Handoff $Path "schema_version must be 1."
    }
    if ((Get-Field $Packet "packet_type") -ne "supersession") {
        Add-ValidationError "invalid-state" $Handoff $Path "packet_type must be 'supersession'."
    }
    if ((Get-Field $Packet "state") -ne "superseded") {
        Add-ValidationError "invalid-state" $Handoff $Path "state must be 'superseded'."
    }
    if ((Get-Field $Packet "handoff_id") -ne $Handoff) {
        Add-ValidationError "invalid-state" $Handoff $Path "handoff_id must match directory name '$Handoff'."
    }
}

function Validate-Writer {
    param($Packet, $Assignment, [string]$WriterField, [string]$Handoff, [string]$Path)
    if ($null -eq $Packet -or $null -eq $Assignment) {
        return
    }
    $expectedWriters = Get-Field $Assignment "expected_writers"
    if ($null -eq $expectedWriters) {
        return
    }
    $expected = Get-Field $expectedWriters $WriterField
    if ($null -eq $expected) {
        Add-ValidationError "missing-field" $Handoff "assignment.json" "expected_writers.$WriterField is required."
        return
    }
    $actual = Get-Field $Packet "writer_role"
    if ($actual -ne $expected) {
        Add-ValidationError "wrong-writer" $Handoff $Path "$WriterField writer_role '$actual' must be '$expected'."
    }
}

if (-not (Test-Path -LiteralPath $resolvedRoot)) {
    Add-ValidationError "missing-field" "<root>" $resolvedRoot "Packet root does not exist."
}
else {
    $handoffDirs = @(Get-ChildItem -LiteralPath $resolvedRoot -Directory | Sort-Object Name)
    $handoffCount = $handoffDirs.Count
    $seenIds = @{}

    foreach ($dir in $handoffDirs) {
        $handoff = $dir.Name
        $activePacketDir = $dir.FullName
        $supersessionPath = Join-Path $dir.FullName "superseded_by.json"

        if (Test-Path -LiteralPath $supersessionPath) {
            $supersession = Read-Packet $supersessionPath $handoff "supersession"
            Validate-Supersession $supersession $handoff $supersessionPath
            $activeRevision = Get-Field $supersession "active_revision"
            if ($null -eq $activeRevision -or [System.IO.Path]::IsPathRooted([string]$activeRevision) -or ([string]$activeRevision).Contains("..")) {
                Add-ValidationError "invalid-state" $handoff $supersessionPath "active_revision must be a relative child path."
            }
            else {
                $candidatePacketDir = Join-Path $dir.FullName $activeRevision
                if (Test-Path -LiteralPath $candidatePacketDir -PathType Container) {
                    $activePacketDir = $candidatePacketDir
                }
                else {
                    Add-ValidationError "missing-field" $handoff $supersessionPath "active_revision '$activeRevision' does not exist."
                }
            }
        }

        $assignmentPath = Join-Path $activePacketDir "assignment.json"
        $ackPath = Join-Path $activePacketDir "acknowledgment.json"
        $completionPath = Join-Path $activePacketDir "completion.json"

        $assignment = Read-Packet $assignmentPath $handoff "assignment"
        $acknowledgment = Read-Packet $ackPath $handoff "acknowledgment"
        $completion = Read-Packet $completionPath $handoff "completion"

        Validate-RequiredFields $assignment @(
            "schema_version", "packet_type", "handoff_id", "revision", "state", "writer_role",
            "created_at", "owner", "canonical_issue", "objective", "non_goals",
            "expected_writers", "dependencies", "required_evidence", "next_owner"
        ) $handoff $assignmentPath
        Validate-RequiredFields $acknowledgment @(
            "schema_version", "packet_type", "handoff_id", "revision", "state", "writer_role",
            "created_at", "assignment_revision", "owner", "scope_confirmed",
            "planned_paths", "first_validation", "next_owner"
        ) $handoff $ackPath
        Validate-RequiredFields $completion @(
            "schema_version", "packet_type", "handoff_id", "revision", "state", "writer_role",
            "created_at", "assignment_revision", "acknowledgment_revision", "outcome",
            "changed_paths", "validation", "evidence", "next_owner", "requested_action"
        ) $handoff $completionPath

        Validate-PacketIdentity $assignment "assignment" "assigned" @() $handoff $assignmentPath
        Validate-PacketIdentity $acknowledgment "acknowledgment" "acknowledged" @() $handoff $ackPath
        Validate-PacketIdentity $completion "completion" "" @("completed", "blocked", "needs-decision") $handoff $completionPath

        if ($null -ne $assignment) {
            $handoffId = Get-Field $assignment "handoff_id"
            if ($null -ne $handoffId) {
                if ($seenIds.ContainsKey($handoffId)) {
                    Add-ValidationError "duplicate-ID" $handoff $assignmentPath "handoff_id '$handoffId' is already used by '$($seenIds[$handoffId])'."
                }
                else {
                    $seenIds[$handoffId] = $handoff
                }
            }
        }

        Validate-Writer $assignment $assignment "assignment" $handoff $assignmentPath
        Validate-Writer $acknowledgment $assignment "acknowledgment" $handoff $ackPath
        Validate-Writer $completion $assignment "completion" $handoff $completionPath

        if ($null -ne $completion -and ($null -eq $assignment -or $null -eq $acknowledgment)) {
            Add-ValidationError "terminal-retention" $handoff $completionPath "completion.json exists but assignment.json and acknowledgment.json must be retained."
        }

        $assignmentRevision = Get-Field $assignment "revision"
        $ackRevision = Get-Field $acknowledgment "revision"
        if ($null -ne $acknowledgment -and $null -ne $assignment -and (Get-Field $acknowledgment "assignment_revision") -ne $assignmentRevision) {
            Add-ValidationError "revision-context" $handoff $ackPath "acknowledgment.assignment_revision must match assignment.revision '$assignmentRevision'."
        }
        if ($null -ne $completion -and $null -ne $assignment -and (Get-Field $completion "assignment_revision") -ne $assignmentRevision) {
            Add-ValidationError "revision-context" $handoff $completionPath "completion.assignment_revision must match assignment.revision '$assignmentRevision'."
        }
        if ($null -ne $completion -and $null -ne $acknowledgment -and (Get-Field $completion "acknowledgment_revision") -ne $ackRevision) {
            Add-ValidationError "revision-context" $handoff $completionPath "completion.acknowledgment_revision must match acknowledgment.revision '$ackRevision'."
        }

        if ($null -ne $completion) {
            if ((Get-ArrayCount (Get-Field $completion "validation")) -eq 0 -or (Get-ArrayCount (Get-Field $completion "evidence")) -eq 0) {
                Add-ValidationError "missing-evidence" $handoff $completionPath "completion.json must contain non-empty validation and evidence arrays."
            }
        }

        if ($null -ne $assignment -and $null -ne $completion -and (Get-Field $completion "state") -eq "completed") {
            $dependencies = Get-Field $assignment "dependencies"
            foreach ($dependency in @($dependencies)) {
                if ($null -ne $dependency -and (Get-Field $dependency "state" "satisfied") -ne "satisfied") {
                    Add-ValidationError "blocked-dependency" $handoff $completionPath "completion cannot be completed while dependency '$((Get-Field $dependency "id" "<unnamed>"))' is '$((Get-Field $dependency "state"))'."
                }
            }
        }
    }
}

$status = "failed"
if ($errors.Count -eq 0) {
    $status = "ok"
}

$errorItems = @()
foreach ($validationError in $errors) {
    $errorItems += $validationError
}

$result = New-Object PSObject
$result | Add-Member -MemberType NoteProperty -Name "status" -Value $status
$result | Add-Member -MemberType NoteProperty -Name "root" -Value $resolvedRoot
$result | Add-Member -MemberType NoteProperty -Name "handoff_count" -Value $handoffCount
$result | Add-Member -MemberType NoteProperty -Name "error_count" -Value $errors.Count
$result | Add-Member -MemberType NoteProperty -Name "errors" -Value $errorItems

if ($errors.Count -eq 0) {
    Write-Host "HANDOFF_PACKET_VALIDATION_OK root=$resolvedRoot handoffs=$handoffCount errors=0"
}
else {
    Write-Host "HANDOFF_PACKET_VALIDATION_FAILED root=$resolvedRoot handoffs=$handoffCount errors=$($errors.Count)"
    foreach ($validationError in $errors) {
        Write-Host "- [$($validationError.code)] $($validationError.handoff): $($validationError.message)"
    }
}

Write-Host "HANDOFF_PACKET_VALIDATION_JSON $($result | ConvertTo-Json -Depth 8 -Compress)"

if ($errors.Count -gt 0) {
    exit 1
}
exit 0
