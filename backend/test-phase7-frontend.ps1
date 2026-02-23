# Phase 7 Frontend - Document API Test
$baseUrl = "http://localhost:5000/api"
$brandId = "512156eb-7398-46a0-bca5-757f2276622d"
$passed = 0
$failed = 0

function Test-Pass($msg) { Write-Host "   [PASS] $msg" -ForegroundColor Green; $script:passed++ }
function Test-Fail($msg) { Write-Host "   [FAIL] $msg" -ForegroundColor Red; $script:failed++ }

Write-Host "=== PHASE 7 DOCUMENT MANAGEMENT - FRONTEND API TEST ===" -ForegroundColor Cyan

# Login
Write-Host "`n[SETUP] Authenticating..." -ForegroundColor Yellow
try {
    $loginBody = @{ email = "statsfix@example.com"; password = "Password123!" } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $login.data.accessToken
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "   [OK] Logged in" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Login failed: $_" -ForegroundColor Red
    exit 1
}

# TEST 1: Get Brand Documents (empty list)
Write-Host "`n[TEST 1] Get Brand Documents" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Get documents works (count: $($r.data.documents.Count))"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Get documents: $_" }

# TEST 2: Get Document Stats
Write-Host "`n[TEST 2] Get Document Stats" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId/stats" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Stats endpoint works (total: $($r.data.stats.total_documents))"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Get stats: $_" }

# TEST 3: Upload Document
Write-Host "`n[TEST 3] Upload Document" -ForegroundColor Cyan
try {
    $boundary = [System.Guid]::NewGuid().ToString()
    $fileContent = "This is a test document for Phase 7 frontend testing."
    $fileName = "test-frontend-doc.txt"
    
    $body = "--$boundary`r`n"
    $body += "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"`r`n"
    $body += "Content-Type: text/plain`r`n`r`n"
    $body += "$fileContent`r`n"
    $body += "--$boundary`r`n"
    $body += "Content-Disposition: form-data; name=`"name`"`r`n`r`n"
    $body += "Frontend Test Document`r`n"
    $body += "--$boundary`r`n"
    $body += "Content-Disposition: form-data; name=`"category`"`r`n`r`n"
    $body += "general`r`n"
    $body += "--$boundary`r`n"
    $body += "Content-Disposition: form-data; name=`"visibility`"`r`n`r`n"
    $body += "private`r`n"
    $body += "--$boundary--`r`n"
    
    $uploadHeaders = @{
        Authorization = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId/upload" -Method POST -Headers $uploadHeaders -Body $body
    $docId = $r.data.document.id
    if ($r.status -eq "success" -and $docId) {
        Test-Pass "Document uploaded (ID: $docId)"
    } else { Test-Fail "Upload failed" }
} catch { Test-Fail "Upload document: $_" }

# TEST 4: Get Documents (should have 1 now)
Write-Host "`n[TEST 4] Get Documents After Upload" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId" -Method GET -Headers $headers
    if ($r.status -eq "success" -and $r.data.documents.Count -gt 0) {
        Test-Pass "Documents list updated (count: $($r.data.documents.Count))"
        $docId = $r.data.documents[0].id
    } else { Test-Fail "No documents found after upload" }
} catch { Test-Fail "Get documents: $_" }

# TEST 5: Get Single Document
Write-Host "`n[TEST 5] Get Single Document" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId/$docId" -Method GET -Headers $headers
    $doc = $r.data.document
    if ($r.status -eq "success" -and $doc.id -eq $docId) {
        Test-Pass "Get single document works (name: $($doc.name))"
    } else { Test-Fail "Wrong document returned" }
} catch { Test-Fail "Get single document: $_" }

# TEST 6: Update Document
Write-Host "`n[TEST 6] Update Document Metadata" -ForegroundColor Cyan
try {
    $body = @{
        name = "Updated Frontend Test Document"
        category = "report"
        visibility = "team"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId/$docId" -Method PATCH -ContentType "application/json" -Headers $headers -Body $body
    if ($r.status -eq "success") {
        Test-Pass "Document updated (category=report, visibility=team)"
    } else { Test-Fail "Update failed" }
} catch { Test-Fail "Update document: $_" }

# TEST 7: Filter by Category
Write-Host "`n[TEST 7] Filter Documents by Category" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId`?category=report" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Filter by category works (count: $($r.data.documents.Count))"
    } else { Test-Fail "Filter failed" }
} catch { Test-Fail "Filter documents: $_" }

# TEST 8: Search Documents
Write-Host "`n[TEST 8] Search Documents" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId`?search=Frontend" -Method GET -Headers $headers
    if ($r.status -eq "success" -and $r.data.documents.Count -gt 0) {
        Test-Pass "Search works (count: $($r.data.documents.Count))"
    } else { Test-Fail "Search returned no results" }
} catch { Test-Fail "Search documents: $_" }

# TEST 9: Get Document Shares (empty)
Write-Host "`n[TEST 9] Get Document Shares" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId/$docId/shares" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Get shares works (count: $($r.data.shares.Count))"
    } else { Test-Fail "Get shares failed" }
} catch { Test-Fail "Get shares: $_" }

# TEST 10: Get Document Versions (empty)
Write-Host "`n[TEST 10] Get Document Versions" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId/$docId/versions" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Get versions works (count: $($r.data.versions.Count))"
    } else { Test-Fail "Get versions failed" }
} catch { Test-Fail "Get versions: $_" }

# TEST 11: Stats After Upload
Write-Host "`n[TEST 11] Stats After Upload" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId/stats" -Method GET -Headers $headers
    $total = [int]$r.data.stats.total_documents
    if ($r.status -eq "success" -and $total -gt 0) {
        Test-Pass "Stats updated (total: $total)"
    } else { Test-Fail "Stats not updated" }
} catch { Test-Fail "Get stats: $_" }

# TEST 12: Delete Document
Write-Host "`n[TEST 12] Delete Document" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/documents/$brandId/$docId" -Method DELETE -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Document deleted"
    } else { Test-Fail "Delete failed" }
} catch { Test-Fail "Delete document: $_" }

# SUMMARY
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "PHASE 7 FRONTEND TEST RESULTS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "PASSED: $passed" -ForegroundColor Green
Write-Host "FAILED: $failed" -ForegroundColor Red
Write-Host "TOTAL:  $($passed + $failed)" -ForegroundColor White

if ($failed -eq 0) {
    Write-Host "`nALL TESTS PASSED - Phase 7 Document Management frontend is working." -ForegroundColor Green
} else {
    Write-Host "`n$failed test(s) failed." -ForegroundColor Yellow
}
