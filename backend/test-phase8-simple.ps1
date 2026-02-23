# Phase 8: Messaging System - Test Script

Write-Host "========================================"
Write-Host "Phase 8: Messaging System - Testing"
Write-Host "========================================"
Write-Host ""

$baseUrl = "http://localhost:5000/api"
$testResults = @()

# Login
Write-Host "Step 1: User Login"
$loginBody = @{
    email = "phase8@test.com"
    password = "TestPass123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.accessToken
    $userId = $loginResponse.data.user.id
    Write-Host "Login successful - User ID: $userId"
    Write-Host "Token: $($token.Substring(0, 20))..."
    Write-Host ""
} catch {
    Write-Host "Login failed: $($_.Exception.Message)"
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$brandId = "355259ce-e403-419b-b8d7-e499b5f5853e"
Write-Host "Using Brand ID: $brandId"
Write-Host ""

# TEST 1: Create Thread
Write-Host "Test 1: Create Message Thread"
$createThreadBody = Get-Content "test-create-thread.json" | ConvertFrom-Json | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads" -Method Post -Headers $headers -Body $createThreadBody
    $threadId = $response.data.thread.id
    Write-Host "PASS - Thread ID: $threadId"
    $testResults += @{ Test = "Create Thread"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Create Thread"; Status = "FAIL" }
}
Write-Host ""

# TEST 2: Get All Threads
Write-Host "Test 2: Get All Threads"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads" -Method Get -Headers $headers
    Write-Host "PASS - Count: $($response.results)"
    $testResults += @{ Test = "Get All Threads"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Get All Threads"; Status = "FAIL" }
}
Write-Host ""

# TEST 3: Get Single Thread
Write-Host "Test 3: Get Single Thread"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId" -Method Get -Headers $headers
    Write-Host "PASS - Subject: $($response.data.thread.subject)"
    $testResults += @{ Test = "Get Single Thread"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Get Single Thread"; Status = "FAIL" }
}
Write-Host ""

# TEST 4: Send Message
Write-Host "Test 4: Send Message"
$sendMessageBody = Get-Content "test-send-message.json" | ConvertFrom-Json | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method Post -Headers $headers -Body $sendMessageBody
    $messageId = $response.data.message.id
    Write-Host "PASS - Message ID: $messageId"
    $testResults += @{ Test = "Send Message"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Send Message"; Status = "FAIL" }
}
Write-Host ""

# TEST 5: Get Thread Messages
Write-Host "Test 5: Get Thread Messages"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method Get -Headers $headers
    Write-Host "PASS - Count: $($response.results)"
    $testResults += @{ Test = "Get Thread Messages"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Get Thread Messages"; Status = "FAIL" }
}
Write-Host ""

# TEST 6: Send Another Message
Write-Host "Test 6: Send Another Message"
$message2Body = @{
    content = "This is a follow-up message."
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method Post -Headers $headers -Body $message2Body
    $message2Id = $response.data.message.id
    Write-Host "PASS - Message ID: $message2Id"
    $testResults += @{ Test = "Send Another Message"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Send Another Message"; Status = "FAIL" }
}
Write-Host ""

# TEST 7: Get Unread Count
Write-Host "Test 7: Get Unread Count"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/unread" -Method Get -Headers $headers
    Write-Host "PASS - Unread: $($response.data.unread_count)"
    $testResults += @{ Test = "Get Unread Count"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Get Unread Count"; Status = "FAIL" }
}
Write-Host ""

# TEST 8: Mark Message as Read
Write-Host "Test 8: Mark Message as Read"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/messages/$messageId/read" -Method Patch -Headers $headers
    Write-Host "PASS"
    $testResults += @{ Test = "Mark Message as Read"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Mark Message as Read"; Status = "FAIL" }
}
Write-Host ""

# TEST 9: Mark Thread as Read
Write-Host "Test 9: Mark Thread as Read"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/read" -Method Patch -Headers $headers
    Write-Host "PASS - Marked: $($response.data.count)"
    $testResults += @{ Test = "Mark Thread as Read"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Mark Thread as Read"; Status = "FAIL" }
}
Write-Host ""

# TEST 10: Search Messages
Write-Host "Test 10: Search Messages"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/search?q=project" -Method Get -Headers $headers
    Write-Host "PASS - Results: $($response.results)"
    $testResults += @{ Test = "Search Messages"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Search Messages"; Status = "FAIL" }
}
Write-Host ""

# TEST 11: Update Thread
Write-Host "Test 11: Update Thread"
$updateThreadBody = @{
    subject = "Project Discussion - Updated"
    status = "active"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId" -Method Patch -Headers $headers -Body $updateThreadBody
    Write-Host "PASS"
    $testResults += @{ Test = "Update Thread"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Update Thread"; Status = "FAIL" }
}
Write-Host ""

# TEST 12: Get Thread Participants
Write-Host "Test 12: Get Thread Participants"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/participants" -Method Get -Headers $headers
    Write-Host "PASS - Count: $($response.results)"
    $testResults += @{ Test = "Get Thread Participants"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Get Thread Participants"; Status = "FAIL" }
}
Write-Host ""

# TEST 13: Archive Thread
Write-Host "Test 13: Archive Thread"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId" -Method Delete -Headers $headers
    Write-Host "PASS"
    $testResults += @{ Test = "Archive Thread"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Archive Thread"; Status = "FAIL" }
}
Write-Host ""

# Summary
Write-Host "========================================"
Write-Host "TEST SUMMARY"
Write-Host "========================================"
$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "Total: $($testResults.Count)"
Write-Host "Passed: $passCount"
Write-Host "Failed: $failCount"
Write-Host ""
$testResults | Format-Table -AutoSize
