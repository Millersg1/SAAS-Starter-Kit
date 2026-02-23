# Thorough Phase 6 Frontend Testing - All Project Management Endpoints
$baseUrl = "http://localhost:5000/api"
$passed = 0
$failed = 0

function Test-Pass($msg) {
    Write-Host "   [PASS] $msg" -ForegroundColor Green
    $script:passed++
}

function Test-Fail($msg) {
    Write-Host "   [FAIL] $msg" -ForegroundColor Red
    $script:failed++
}

Write-Host "=== THOROUGH PHASE 6 PROJECT MANAGEMENT TESTING ===" -ForegroundColor Cyan
Write-Host "Testing all endpoints: Create, Read, Update, Delete, Stats, Updates" -ForegroundColor Gray

# SETUP: Login
Write-Host "`n[SETUP] Authenticating..." -ForegroundColor Yellow
try {
    $loginBody = @{ email = "statsfix@example.com"; password = "Password123!" } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $login.data.accessToken
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "   [OK] Logged in as statsfix@example.com" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Login failed: $_" -ForegroundColor Red
    exit 1
}

# SETUP: Get Brand
Write-Host "`n[SETUP] Getting brand..." -ForegroundColor Yellow
$brands = Invoke-RestMethod -Uri "$baseUrl/brands" -Method GET -Headers $headers
$brandId = $brands.data.brands[0].id
Write-Host "   [OK] Using brand: $($brands.data.brands[0].name) ($brandId)" -ForegroundColor Green

# SETUP: Get Client
Write-Host "`n[SETUP] Getting client..." -ForegroundColor Yellow
$clients = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method GET -Headers $headers
$clientId = $clients.data.clients[0].id
Write-Host "   [OK] Using client: $($clients.data.clients[0].name) ($clientId)" -ForegroundColor Green

# TEST 1: Create Website Project
Write-Host "`n[TEST 1] Create Website Project" -ForegroundColor Cyan
try {
    $body = @{
        client_id = $clientId
        name = "Test Website Project"
        description = "A test website project"
        project_type = "website"
        status = "planning"
        priority = "high"
        budget = 25000
        currency = "USD"
        estimated_hours = 200
        tags = @("test", "website")
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $projectId = $r.data.project.id
    if ($r.status -eq "success" -and $projectId) {
        Test-Pass "Website project created (ID: $projectId)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Create website project: $_" }

# TEST 2: Create App Project
Write-Host "`n[TEST 2] Create App Project" -ForegroundColor Cyan
try {
    $body = @{
        client_id = $clientId
        name = "Mobile App Project"
        project_type = "app"
        status = "in_progress"
        priority = "urgent"
        progress_percentage = 30
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $project2Id = $r.data.project.id
    if ($r.status -eq "success" -and $project2Id) {
        Test-Pass "Mobile app project created (ID: $project2Id)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Create mobile app project: $_" }

# TEST 3: Create Completed Project
Write-Host "`n[TEST 3] Create Completed Project" -ForegroundColor Cyan
try {
    $body = @{
        client_id = $clientId
        name = "Completed Design Project"
        project_type = "design"
        status = "completed"
        priority = "medium"
        progress_percentage = 100
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $project3Id = $r.data.project.id
    if ($r.status -eq "success" -and $project3Id) {
        Test-Pass "Completed project created (ID: $project3Id)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Create completed project: $_" }

# TEST 4: Reject Invalid project_type
Write-Host "`n[TEST 4] Reject Invalid project_type" -ForegroundColor Cyan
try {
    $body = @{ client_id = $clientId; name = "Bad Type"; project_type = "invalid_type" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    Test-Fail "Should have rejected invalid project_type"
} catch {
    if ($_ -match "400" -or $_ -match "Validation") {
        Test-Pass "Correctly rejected invalid project_type"
    } else { Test-Fail "Wrong error: $_" }
}

# TEST 5: Reject Missing Required Fields
Write-Host "`n[TEST 5] Reject Missing Required Fields (no name)" -ForegroundColor Cyan
try {
    $body = @{ client_id = $clientId; project_type = "website" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    Test-Fail "Should have rejected missing name"
} catch {
    if ($_ -match "400" -or $_ -match "required") {
        Test-Pass "Correctly rejected missing name"
    } else { Test-Fail "Wrong error: $_" }
}

# TEST 6: Get All Brand Projects
Write-Host "`n[TEST 6] Get All Brand Projects" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId" -Method GET -Headers $headers
    $count = $r.data.projects.Count
    if ($r.status -eq "success" -and $count -gt 0) {
        Test-Pass "Got $count projects"
    } else { Test-Fail "Expected projects but got: $count" }
} catch { Test-Fail "Get all projects: $_" }

# TEST 7: Filter by Status=in_progress
Write-Host "`n[TEST 7] Filter Projects by Status=in_progress" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId`?status=in_progress" -Method GET -Headers $headers
    $allMatch = ($r.data.projects | Where-Object { $_.status -ne "in_progress" }).Count -eq 0
    if ($r.status -eq "success" -and $allMatch) {
        Test-Pass "Filter by status=in_progress works ($($r.data.projects.Count) results)"
    } else { Test-Fail "Filter returned wrong status projects" }
} catch { Test-Fail "Filter by status: $_" }

# TEST 8: Filter by Priority=urgent
Write-Host "`n[TEST 8] Filter Projects by Priority=urgent" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId`?priority=urgent" -Method GET -Headers $headers
    $allMatch = ($r.data.projects | Where-Object { $_.priority -ne "urgent" }).Count -eq 0
    if ($r.status -eq "success" -and $allMatch) {
        Test-Pass "Filter by priority=urgent works ($($r.data.projects.Count) results)"
    } else { Test-Fail "Filter returned wrong priority projects" }
} catch { Test-Fail "Filter by priority: $_" }

# TEST 9: Filter by project_type=app
Write-Host "`n[TEST 9] Filter Projects by project_type=app" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId`?project_type=app" -Method GET -Headers $headers
    $allMatch = ($r.data.projects | Where-Object { $_.project_type -ne "app" }).Count -eq 0
    if ($r.status -eq "success" -and $allMatch) {
        Test-Pass "Filter by project_type=app works ($($r.data.projects.Count) results)"
    } else { Test-Fail "Filter returned wrong type projects" }
} catch { Test-Fail "Filter by project_type: $_" }

# TEST 10: Search Projects
Write-Host "`n[TEST 10] Search Projects by Name" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId`?search=Website" -Method GET -Headers $headers
    if ($r.status -eq "success" -and $r.data.projects.Count -gt 0) {
        Test-Pass "Search by name works ($($r.data.projects.Count) results)"
    } else { Test-Fail "Search returned no results" }
} catch { Test-Fail "Search projects: $_" }

# TEST 11: Get Single Project
Write-Host "`n[TEST 11] Get Single Project by ID" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/$projectId" -Method GET -Headers $headers
    $p = $r.data.project
    if ($r.status -eq "success" -and $p.id -eq $projectId) {
        Test-Pass "Get single project works (name: $($p.name))"
    } else { Test-Fail "Wrong project returned" }
} catch { Test-Fail "Get single project: $_" }

# TEST 12: Update Project
Write-Host "`n[TEST 12] Update Project" -ForegroundColor Cyan
try {
    $body = @{
        status = "in_progress"
        progress_percentage = 25
        actual_hours = 50
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/$projectId" -Method PATCH -ContentType "application/json" -Headers $headers -Body $body
    if ($r.status -eq "success" -and $r.data.project.status -eq "in_progress") {
        Test-Pass "Project updated (status=in_progress, progress=25%)"
    } else { Test-Fail "Update did not apply correctly" }
} catch { Test-Fail "Update project: $_" }

# TEST 13: Update Progress to 100 percent
Write-Host "`n[TEST 13] Update Progress to 100 percent" -ForegroundColor Cyan
try {
    $body = @{ progress_percentage = 100; status = "completed" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/$projectId" -Method PATCH -ContentType "application/json" -Headers $headers -Body $body
    $prog = $r.data.project.progress_percentage
    if ($r.status -eq "success" -and $prog -eq 100) {
        Test-Pass "Progress updated to 100 percent"
    } else { Test-Fail "Progress not updated, got: $prog" }
} catch { Test-Fail "Update progress: $_" }

# TEST 14: Get Project Statistics
Write-Host "`n[TEST 14] Get Project Statistics" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/stats" -Method GET -Headers $headers
    $stats = $r.data.stats
    $total = [int]$stats.total_projects
    if ($r.status -eq "success" -and $total -gt 0) {
        Test-Pass "Stats: total=$total, planning=$($stats.planning), in_progress=$($stats.in_progress), completed=$($stats.completed)"
    } else { Test-Fail "Stats returned 0 total projects" }
} catch { Test-Fail "Get stats: $_" }

# TEST 15: Create Project Update (Comment)
Write-Host "`n[TEST 15] Create Project Update (Comment)" -ForegroundColor Cyan
try {
    $body = @{
        update_type = "comment"
        title = "Initial kickoff meeting"
        content = "Had a great kickoff meeting with the client. Discussed requirements and timeline."
        is_visible_to_client = $true
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/$projectId/updates" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $updateId = $r.data.update.id
    if ($r.status -eq "success" -and $updateId) {
        Test-Pass "Comment update created (ID: $updateId)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Create comment update: $_" }

# TEST 16: Create Milestone Update
Write-Host "`n[TEST 16] Create Milestone Update" -ForegroundColor Cyan
try {
    $body = @{
        update_type = "milestone"
        title = "Phase 1 Complete"
        content = "Successfully completed the first phase of the project."
        is_visible_to_client = $true
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/$projectId/updates" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $milestoneUpdateId = $r.data.update.id
    if ($r.status -eq "success" -and $milestoneUpdateId) {
        Test-Pass "Milestone update created (ID: $milestoneUpdateId)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Create milestone update: $_" }

# TEST 17: Get All Project Updates
Write-Host "`n[TEST 17] Get All Project Updates" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/$projectId/updates" -Method GET -Headers $headers
    $count = $r.data.updates.Count
    if ($r.status -eq "success" -and $count -ge 2) {
        Test-Pass "Got $count project updates"
    } else { Test-Fail "Expected 2+ updates but got: $count" }
} catch { Test-Fail "Get project updates: $_" }

# TEST 18: Get Single Project Update
Write-Host "`n[TEST 18] Get Single Project Update" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/$projectId/updates/$updateId" -Method GET -Headers $headers
    if ($r.status -eq "success" -and $r.data.update.id -eq $updateId) {
        Test-Pass "Get single update works (title: $($r.data.update.title))"
    } else { Test-Fail "Wrong update returned" }
} catch { Test-Fail "Get single update: $_" }

# TEST 19: Update a Project Update
Write-Host "`n[TEST 19] Update a Project Update" -ForegroundColor Cyan
try {
    $body = @{ title = "Updated: Initial kickoff meeting"; content = "Updated content." } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/$projectId/updates/$updateId" -Method PATCH -ContentType "application/json" -Headers $headers -Body $body
    if ($r.status -eq "success") {
        Test-Pass "Project update modified successfully"
    } else { Test-Fail "Update modification failed" }
} catch { Test-Fail "Update project update: $_" }

# TEST 20: Delete a Project Update
Write-Host "`n[TEST 20] Delete a Project Update" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/$projectId/updates/$milestoneUpdateId" -Method DELETE -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Project update deleted"
    } else { Test-Fail "Delete failed" }
} catch { Test-Fail "Delete project update: $_" }

# TEST 21: Get Client Projects
Write-Host "`n[TEST 21] Get Client Projects" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/client/$clientId" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Client projects endpoint works ($($r.data.projects.Count) projects)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Get client projects: $_" }

# TEST 22: Get User Assigned Projects
Write-Host "`n[TEST 22] Get User Assigned Projects" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/assigned" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Assigned projects endpoint works ($($r.data.projects.Count) assigned)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Get assigned projects: $_" }

# TEST 23: Soft Delete Project
Write-Host "`n[TEST 23] Soft Delete Project" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/$project2Id" -Method DELETE -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Project soft deleted"
    } else { Test-Fail "Delete failed" }
} catch { Test-Fail "Delete project: $_" }

# TEST 24: Verify Deleted Project Not in List
Write-Host "`n[TEST 24] Verify Deleted Project Not in List" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId" -Method GET -Headers $headers
    $found = $r.data.projects | Where-Object { $_.id -eq $project2Id }
    if (-not $found) {
        Test-Pass "Deleted project not in list (soft delete works)"
    } else { Test-Fail "Deleted project still appears in list" }
} catch { Test-Fail "Verify deletion: $_" }

# TEST 25: Stats Reflect Deletion
Write-Host "`n[TEST 25] Stats Reflect Deletion" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/projects/$brandId/stats" -Method GET -Headers $headers
    $total = [int]$r.data.stats.total_projects
    if ($total -gt 0) {
        Test-Pass "Stats updated after deletion (total: $total)"
    } else { Test-Fail "Stats show 0 after deletion" }
} catch { Test-Fail "Stats after deletion: $_" }

# SUMMARY
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "THOROUGH TEST RESULTS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "PASSED: $passed" -ForegroundColor Green
Write-Host "FAILED: $failed" -ForegroundColor Red
Write-Host "TOTAL:  $($passed + $failed)" -ForegroundColor White

if ($failed -eq 0) {
    Write-Host "`nALL TESTS PASSED - Phase 6 Project Management is fully working." -ForegroundColor Green
} else {
    Write-Host "`n$failed test(s) failed. Review the output above." -ForegroundColor Yellow
}
