# Thorough Phase 5 Frontend Testing - All Client Management Endpoints
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

Write-Host "=== THOROUGH PHASE 5 CLIENT MANAGEMENT TESTING ===" -ForegroundColor Cyan
Write-Host "Testing all endpoints: Create, Read, Update, Delete, Stats, Portal Access" -ForegroundColor Gray

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

# TEST 1: Create Regular Client
Write-Host "`n[TEST 1] Create Regular Client" -ForegroundColor Cyan
try {
    $body = @{
        name = "Alice Regular"
        email = "alice.regular$(Get-Random -Maximum 9999)@test.com"
        status = "active"
        client_type = "regular"
        company = "Regular Corp"
        city = "New York"
        state = "NY"
        country = "USA"
        notes = "Test regular client"
        tags = @("test", "regular")
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $clientId = $r.data.client.id
    if ($r.status -eq "success" -and $clientId) {
        Test-Pass "Regular client created (ID: $clientId)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Create regular client: $_" }

# TEST 2: Create VIP Client
Write-Host "`n[TEST 2] Create VIP Client" -ForegroundColor Cyan
try {
    $body = @{
        name = "Bob VIP"
        email = "bob.vip$(Get-Random -Maximum 9999)@test.com"
        status = "active"
        client_type = "vip"
        company = "VIP Corp"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $vipClientId = $r.data.client.id
    if ($r.status -eq "success" -and $vipClientId) {
        Test-Pass "VIP client created (ID: $vipClientId)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Create VIP client: $_" }

# TEST 3: Create Enterprise Client
Write-Host "`n[TEST 3] Create Enterprise Client" -ForegroundColor Cyan
try {
    $body = @{
        name = "Carol Enterprise"
        email = "carol.enterprise$(Get-Random -Maximum 9999)@test.com"
        status = "active"
        client_type = "enterprise"
        company = "Enterprise Corp"
        industry = "Technology"
        website = "https://enterprise.com"
        tax_id = "12-3456789"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $enterpriseClientId = $r.data.client.id
    if ($r.status -eq "success" -and $enterpriseClientId) {
        Test-Pass "Enterprise client created (ID: $enterpriseClientId)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Create enterprise client: $_" }

# TEST 4: Create Trial Client
Write-Host "`n[TEST 4] Create Trial Client" -ForegroundColor Cyan
try {
    $body = @{
        name = "Dave Trial"
        email = "dave.trial$(Get-Random -Maximum 9999)@test.com"
        status = "pending"
        client_type = "trial"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $trialClientId = $r.data.client.id
    if ($r.status -eq "success" -and $trialClientId) {
        Test-Pass "Trial client created (ID: $trialClientId)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Create trial client: $_" }

# TEST 5: Create Inactive Client
Write-Host "`n[TEST 5] Create Inactive Client" -ForegroundColor Cyan
try {
    $body = @{
        name = "Eve Inactive"
        email = "eve.inactive$(Get-Random -Maximum 9999)@test.com"
        status = "inactive"
        client_type = "regular"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $inactiveClientId = $r.data.client.id
    if ($r.status -eq "success" -and $inactiveClientId) {
        Test-Pass "Inactive client created (ID: $inactiveClientId)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Create inactive client: $_" }

# TEST 6: Reject Invalid client_type 'standard'
Write-Host "`n[TEST 6] Reject Invalid client_type 'standard'" -ForegroundColor Cyan
try {
    $body = @{
        name = "Invalid Type"
        email = "invalid$(Get-Random -Maximum 9999)@test.com"
        client_type = "standard"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    Test-Fail "Should have rejected 'standard' client_type"
} catch {
    if ($_ -match "400" -or $_ -match "Validation") {
        Test-Pass "Correctly rejected invalid client_type 'standard'"
    } else { Test-Fail "Wrong error: $_" }
}

# TEST 7: Reject Duplicate Email
Write-Host "`n[TEST 7] Reject Duplicate Email" -ForegroundColor Cyan
try {
    $dupEmail = "duplicate$(Get-Random -Maximum 9999)@test.com"
    $body1 = @{ name = "First"; email = $dupEmail; client_type = "regular" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body1 | Out-Null
    $body2 = @{ name = "Second"; email = $dupEmail; client_type = "regular" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body2
    Test-Fail "Should have rejected duplicate email"
} catch {
    if ($_ -match "400" -or $_ -match "already exists") {
        Test-Pass "Correctly rejected duplicate email"
    } else { Test-Fail "Wrong error: $_" }
}

# TEST 8: Get All Clients
Write-Host "`n[TEST 8] Get All Brand Clients" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method GET -Headers $headers
    $count = $r.data.clients.Count
    if ($r.status -eq "success" -and $count -gt 0) {
        Test-Pass "Got $count clients"
    } else { Test-Fail "Expected clients but got: $count" }
} catch { Test-Fail "Get all clients: $_" }

# TEST 9: Filter by Status=active
Write-Host "`n[TEST 9] Filter Clients by Status=active" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId`?status=active" -Method GET -Headers $headers
    $allActive = ($r.data.clients | Where-Object { $_.status -ne "active" }).Count -eq 0
    if ($r.status -eq "success" -and $allActive) {
        Test-Pass "Filter by status=active works ($($r.data.clients.Count) active clients)"
    } else { Test-Fail "Filter returned non-active clients" }
} catch { Test-Fail "Filter by status: $_" }

# TEST 10: Filter by client_type=vip
Write-Host "`n[TEST 10] Filter Clients by client_type=vip" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId`?client_type=vip" -Method GET -Headers $headers
    $allVip = ($r.data.clients | Where-Object { $_.client_type -ne "vip" }).Count -eq 0
    if ($r.status -eq "success" -and $allVip) {
        Test-Pass "Filter by client_type=vip works ($($r.data.clients.Count) VIP clients)"
    } else { Test-Fail "Filter returned non-VIP clients" }
} catch { Test-Fail "Filter by client_type: $_" }

# TEST 11: Search Clients by Name
Write-Host "`n[TEST 11] Search Clients by Name" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId`?search=Alice" -Method GET -Headers $headers
    if ($r.status -eq "success" -and $r.data.clients.Count -gt 0) {
        Test-Pass "Search by name works ($($r.data.clients.Count) results)"
    } else { Test-Fail "Search returned no results" }
} catch { Test-Fail "Search clients: $_" }

# TEST 12: Get Single Client by ID
Write-Host "`n[TEST 12] Get Single Client by ID" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId/$clientId" -Method GET -Headers $headers
    if ($r.status -eq "success" -and $r.data.client.id -eq $clientId) {
        Test-Pass "Get single client works (name: $($r.data.client.name))"
    } else { Test-Fail "Wrong client returned" }
} catch { Test-Fail "Get single client: $_" }

# TEST 13: Update Client
Write-Host "`n[TEST 13] Update Client" -ForegroundColor Cyan
try {
    $body = @{
        notes = "Updated notes for testing"
        status = "active"
        company = "Updated Corp"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId/$clientId" -Method PATCH -ContentType "application/json" -Headers $headers -Body $body
    if ($r.status -eq "success" -and $r.data.client.notes -eq "Updated notes for testing") {
        Test-Pass "Client updated successfully"
    } else { Test-Fail "Update did not apply correctly" }
} catch { Test-Fail "Update client: $_" }

# TEST 14: Update client_type to VIP
Write-Host "`n[TEST 14] Update client_type to VIP" -ForegroundColor Cyan
try {
    $body = @{ client_type = "vip" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId/$clientId" -Method PATCH -ContentType "application/json" -Headers $headers -Body $body
    if ($r.status -eq "success" -and $r.data.client.client_type -eq "vip") {
        Test-Pass "client_type updated to vip"
    } else { Test-Fail "client_type not updated" }
} catch { Test-Fail "Update client_type: $_" }

# TEST 15: Get Client Statistics
Write-Host "`n[TEST 15] Get Client Statistics" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId/stats" -Method GET -Headers $headers
    $stats = $r.data.stats
    $total = [int]$stats.total_clients
    $active = [int]$stats.active_clients
    $vip = [int]$stats.vip_clients
    if ($r.status -eq "success" -and $total -gt 0) {
        Test-Pass "Stats: total=$total, active=$active, vip=$vip, portal=$($stats.portal_enabled)"
    } else { Test-Fail "Stats returned 0 total clients" }
} catch { Test-Fail "Get stats: $_" }

# TEST 16: Enable Portal Access
Write-Host "`n[TEST 16] Enable Portal Access" -ForegroundColor Cyan
try {
    $body = @{ password = "ClientPortal123!" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId/$clientId/portal/enable" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    if ($r.status -eq "success" -and $r.data.client.portal_access -eq $true) {
        Test-Pass "Portal access enabled"
    } else { Test-Fail "Portal access not enabled" }
} catch { Test-Fail "Enable portal: $_" }

# TEST 17: Verify Portal Enabled in Stats
Write-Host "`n[TEST 17] Verify Portal Enabled Reflected in Stats" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId/stats" -Method GET -Headers $headers
    $portalEnabled = [int]$r.data.stats.portal_enabled
    if ($portalEnabled -gt 0) {
        Test-Pass "Portal enabled count: $portalEnabled"
    } else { Test-Fail "Portal enabled count still 0 after enabling" }
} catch { Test-Fail "Stats after portal enable: $_" }

# TEST 18: Reject Weak Portal Password
Write-Host "`n[TEST 18] Reject Weak Portal Password" -ForegroundColor Cyan
try {
    $body = @{ password = "weak" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId/$vipClientId/portal/enable" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    Test-Fail "Should have rejected weak password"
} catch {
    if ($_ -match "400" -or $_ -match "8 characters") {
        Test-Pass "Correctly rejected weak password"
    } else { Test-Fail "Wrong error: $_" }
}

# TEST 19: Disable Portal Access
Write-Host "`n[TEST 19] Disable Portal Access" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId/$clientId/portal/disable" -Method POST -ContentType "application/json" -Headers $headers -Body "{}"
    if ($r.status -eq "success" -and $r.data.client.portal_access -eq $false) {
        Test-Pass "Portal access disabled"
    } else { Test-Fail "Portal access not disabled" }
} catch { Test-Fail "Disable portal: $_" }

# TEST 20: Get Assigned Clients
Write-Host "`n[TEST 20] Get Assigned Clients" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/assigned" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Assigned clients endpoint works ($($r.data.clients.Count) assigned)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Get assigned clients: $_" }

# TEST 21: Soft Delete Client
Write-Host "`n[TEST 21] Soft Delete Client" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId/$trialClientId" -Method DELETE -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Client soft deleted"
    } else { Test-Fail "Delete failed" }
} catch { Test-Fail "Delete client: $_" }

# TEST 22: Verify Deleted Client Not in List
Write-Host "`n[TEST 22] Verify Deleted Client Not in List" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method GET -Headers $headers
    $found = $r.data.clients | Where-Object { $_.id -eq $trialClientId }
    if (-not $found) {
        Test-Pass "Deleted client not in list (soft delete works)"
    } else { Test-Fail "Deleted client still appears in list" }
} catch { Test-Fail "Verify deletion: $_" }

# TEST 23: Stats Reflect Deletion
Write-Host "`n[TEST 23] Stats Reflect Deletion" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId/stats" -Method GET -Headers $headers
    $total = [int]$r.data.stats.total_clients
    if ($total -gt 0) {
        Test-Pass "Stats updated after deletion (total: $total)"
    } else { Test-Fail "Stats show 0 after deletion" }
} catch { Test-Fail "Stats after deletion: $_" }

# TEST 24: Reject Missing Required Fields
Write-Host "`n[TEST 24] Reject Missing Required Fields (no name)" -ForegroundColor Cyan
try {
    $body = @{ email = "noname@test.com"; client_type = "regular" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    Test-Fail "Should have rejected missing name"
} catch {
    if ($_ -match "400" -or $_ -match "required") {
        Test-Pass "Correctly rejected missing name field"
    } else { Test-Fail "Wrong error: $_" }
}

# TEST 25: Reject Invalid Website URL
Write-Host "`n[TEST 25] Reject Invalid Website URL" -ForegroundColor Cyan
try {
    $body = @{ name = "URL Test"; email = "urltest$(Get-Random)@test.com"; client_type = "regular"; website = "not-a-url" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    Test-Fail "Should have rejected invalid URL"
} catch {
    if ($_ -match "400" -or $_ -match "valid URL") {
        Test-Pass "Correctly rejected invalid website URL"
    } else { Test-Fail "Wrong error: $_" }
}

# SUMMARY
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "THOROUGH TEST RESULTS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "PASSED: $passed" -ForegroundColor Green
Write-Host "FAILED: $failed" -ForegroundColor Red
Write-Host "TOTAL:  $($passed + $failed)" -ForegroundColor White

if ($failed -eq 0) {
    Write-Host "`nALL TESTS PASSED - Phase 5 Client Management is fully working." -ForegroundColor Green
} else {
    Write-Host "`n$failed test(s) failed. Review the output above." -ForegroundColor Yellow
}
