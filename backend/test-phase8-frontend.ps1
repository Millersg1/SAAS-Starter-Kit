# Phase 8 Frontend - Messaging API Test
$baseUrl = "http://localhost:5000/api"
$brandId = "512156eb-7398-46a0-bca5-757f2276622d"
$passed = 0
$failed = 0

function Test-Pass($msg) { Write-Host "   [PASS] $msg" -ForegroundColor Green; $script:passed++ }
function Test-Fail($msg) { Write-Host "   [FAIL] $msg" -ForegroundColor Red; $script:failed++ }

Write-Host "=== PHASE 8 MESSAGING SYSTEM - FRONTEND API TEST ===" -ForegroundColor Cyan

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

# TEST 1: Get Brand Threads (empty)
Write-Host "`n[TEST 1] Get Brand Threads" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Get threads works (count: $($r.data.threads.Count))"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Get threads: $_" }

# TEST 2: Get Unread Count
Write-Host "`n[TEST 2] Get Unread Count" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/unread" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Unread count works (count: $($r.data.unread_count))"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Get unread count: $_" }

# TEST 3: Create Thread
Write-Host "`n[TEST 3] Create Thread" -ForegroundColor Cyan
try {
    $body = @{ subject = "Frontend Test Thread" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $threadId = $r.data.thread.id
    if ($r.status -eq "success" -and $threadId) {
        Test-Pass "Thread created (ID: $threadId)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Create thread: $_" }

# TEST 4: Get Single Thread
Write-Host "`n[TEST 4] Get Single Thread" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId" -Method GET -Headers $headers
    if ($r.status -eq "success" -and $r.data.thread.id -eq $threadId) {
        Test-Pass "Get single thread works (subject: $($r.data.thread.subject))"
    } else { Test-Fail "Wrong thread returned" }
} catch { Test-Fail "Get single thread: $_" }

# TEST 5: Send Message
Write-Host "`n[TEST 5] Send Message" -ForegroundColor Cyan
try {
    $body = @{ content = "Hello from frontend test!"; sender_type = "user" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $messageId = $r.data.message.id
    if ($r.status -eq "success" -and $messageId) {
        Test-Pass "Message sent (ID: $messageId)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Send message: $_" }

# TEST 6: Send Second Message
Write-Host "`n[TEST 6] Send Second Message" -ForegroundColor Cyan
try {
    $body = @{ content = "This is a second test message."; sender_type = "user" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method POST -ContentType "application/json" -Headers $headers -Body $body
    $message2Id = $r.data.message.id
    if ($r.status -eq "success" -and $message2Id) {
        Test-Pass "Second message sent (ID: $message2Id)"
    } else { Test-Fail "Unexpected response" }
} catch { Test-Fail "Send second message: $_" }

# TEST 7: Get Thread Messages
Write-Host "`n[TEST 7] Get Thread Messages" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method GET -Headers $headers
    if ($r.status -eq "success" -and $r.data.messages.Count -ge 2) {
        Test-Pass "Get messages works (count: $($r.data.messages.Count))"
    } else { Test-Fail "Expected 2+ messages, got: $($r.data.messages.Count)" }
} catch { Test-Fail "Get messages: $_" }

# TEST 8: Mark Message as Read
Write-Host "`n[TEST 8] Mark Message as Read" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/messages/$messageId/read" -Method PATCH -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Message marked as read"
    } else { Test-Fail "Mark as read failed" }
} catch { Test-Fail "Mark message as read: $_" }

# TEST 9: Mark Thread as Read
Write-Host "`n[TEST 9] Mark Thread as Read" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/read" -Method PATCH -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Thread marked as read"
    } else { Test-Fail "Mark thread as read failed" }
} catch { Test-Fail "Mark thread as read: $_" }

# TEST 10: Update Thread
Write-Host "`n[TEST 10] Update Thread" -ForegroundColor Cyan
try {
    $body = @{ subject = "Updated Frontend Test Thread" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId" -Method PATCH -ContentType "application/json" -Headers $headers -Body $body
    if ($r.status -eq "success") {
        Test-Pass "Thread updated"
    } else { Test-Fail "Update failed" }
} catch { Test-Fail "Update thread: $_" }

# TEST 11: Get Thread Participants
Write-Host "`n[TEST 11] Get Thread Participants" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/participants" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Get participants works (count: $($r.data.participants.Count))"
    } else { Test-Fail "Get participants failed" }
} catch { Test-Fail "Get participants: $_" }

# TEST 12: Search Messages
Write-Host "`n[TEST 12] Search Messages" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/search`?q=frontend" -Method GET -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Search works (results: $($r.data.results.Count))"
    } else { Test-Fail "Search failed" }
} catch { Test-Fail "Search messages: $_" }

# TEST 13: Delete Message
Write-Host "`n[TEST 13] Delete Message" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/messages/$message2Id" -Method DELETE -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Message deleted"
    } else { Test-Fail "Delete failed" }
} catch { Test-Fail "Delete message: $_" }

# TEST 14: Archive Thread
Write-Host "`n[TEST 14] Archive Thread" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId" -Method DELETE -Headers $headers
    if ($r.status -eq "success") {
        Test-Pass "Thread archived"
    } else { Test-Fail "Archive failed" }
} catch { Test-Fail "Archive thread: $_" }

# TEST 15: Verify Thread Archived
Write-Host "`n[TEST 15] Verify Thread Archived (not in active list)" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads" -Method GET -Headers $headers
    $found = $r.data.threads | Where-Object { $_.id -eq $threadId -and $_.status -eq "active" }
    if (-not $found) {
        Test-Pass "Archived thread not in active list"
    } else { Test-Fail "Thread still appears as active" }
} catch { Test-Fail "Verify archive: $_" }

# SUMMARY
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "PHASE 8 FRONTEND TEST RESULTS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "PASSED: $passed" -ForegroundColor Green
Write-Host "FAILED: $failed" -ForegroundColor Red
Write-Host "TOTAL:  $($passed + $failed)" -ForegroundColor White

if ($failed -eq 0) {
    Write-Host "`nALL TESTS PASSED - Phase 8 Messaging frontend is working." -ForegroundColor Green
} else {
    Write-Host "`n$failed test(s) failed." -ForegroundColor Yellow
}
