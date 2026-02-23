# Phase 8: Messaging System - Edge Case Testing

Write-Host "========================================"
Write-Host "Phase 8: Edge Case & Error Testing"
Write-Host "========================================"
Write-Host ""

$baseUrl = "http://localhost:5000/api"
$testResults = @()

# Login
Write-Host "Setup: User Login"
$loginBody = @{
    email = "phase8@test.com"
    password = "TestPass123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.accessToken
    $userId = $loginResponse.data.user.id
    Write-Host "Login successful"
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

# TEST 1: Invalid Thread ID (404)
Write-Host "Test 1: Get Non-Existent Thread (404)"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/00000000-0000-0000-0000-000000000000" -Method Get -Headers $headers
    Write-Host "FAIL - Should have returned 404"
    $testResults += @{ Test = "Invalid Thread ID"; Status = "FAIL" }
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "PASS - Correctly returned 404"
        $testResults += @{ Test = "Invalid Thread ID"; Status = "PASS" }
    } else {
        Write-Host "FAIL - Wrong error: $($_.Exception.Message)"
        $testResults += @{ Test = "Invalid Thread ID"; Status = "FAIL" }
    }
}
Write-Host ""

# TEST 2: Missing Required Fields
Write-Host "Test 2: Create Thread Without Subject"
$invalidThreadBody = @{
    project_id = $null
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads" -Method Post -Headers $headers -Body $invalidThreadBody
    Write-Host "FAIL - Should have returned validation error"
    $testResults += @{ Test = "Missing Subject"; Status = "FAIL" }
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "PASS - Correctly returned 400 validation error"
        $testResults += @{ Test = "Missing Subject"; Status = "PASS" }
    } else {
        Write-Host "FAIL - Wrong error: $($_.Exception.Message)"
        $testResults += @{ Test = "Missing Subject"; Status = "FAIL" }
    }
}
Write-Host ""

# TEST 3: Empty Message Content
Write-Host "Test 3: Send Message With Empty Content"
$createThreadBody = @{
    subject = "Test Thread for Edge Cases"
} | ConvertTo-Json

try {
    $threadResponse = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads" -Method Post -Headers $headers -Body $createThreadBody
    $threadId = $threadResponse.data.thread.id
    
    $emptyMessageBody = @{
        content = ""
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method Post -Headers $headers -Body $emptyMessageBody
    Write-Host "FAIL - Should have rejected empty content"
    $testResults += @{ Test = "Empty Message Content"; Status = "FAIL" }
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "PASS - Correctly rejected empty content"
        $testResults += @{ Test = "Empty Message Content"; Status = "PASS" }
    } else {
        Write-Host "FAIL - Wrong error: $($_.Exception.Message)"
        $testResults += @{ Test = "Empty Message Content"; Status = "FAIL" }
    }
}
Write-Host ""

# TEST 4: Very Long Message Content
Write-Host "Test 4: Send Message With Very Long Content"
$longContent = "A" * 10000
$longMessageBody = @{
    content = $longContent
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method Post -Headers $headers -Body $longMessageBody
    Write-Host "PASS - Accepted long content (10000 chars)"
    $testResults += @{ Test = "Long Message Content"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Long Message Content"; Status = "FAIL" }
}
Write-Host ""

# TEST 5: Special Characters in Message
Write-Host "Test 5: Send Message With Special Characters"
$specialCharsBody = @{
    content = "Test with special chars: <script>alert('xss')</script> & 'quotes' `"double`" \n newline \t tab"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method Post -Headers $headers -Body $specialCharsBody
    Write-Host "PASS - Handled special characters"
    $testResults += @{ Test = "Special Characters"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Special Characters"; Status = "FAIL" }
}
Write-Host ""

# TEST 6: Invalid Brand ID (Unauthorized)
Write-Host "Test 6: Access Different Brand's Threads"
$fakeBrandId = "00000000-0000-0000-0000-000000000000"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$fakeBrandId/threads" -Method Get -Headers $headers
    Write-Host "FAIL - Should have returned 401/403"
    $testResults += @{ Test = "Unauthorized Brand Access"; Status = "FAIL" }
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 403) {
        Write-Host "PASS - Correctly blocked unauthorized access"
        $testResults += @{ Test = "Unauthorized Brand Access"; Status = "PASS" }
    } else {
        Write-Host "FAIL - Wrong error: $($_.Exception.Message)"
        $testResults += @{ Test = "Unauthorized Brand Access"; Status = "FAIL" }
    }
}
Write-Host ""

# TEST 7: Pagination Edge Cases
Write-Host "Test 7: Pagination With Page 0"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads?page=0&limit=10" -Method Get -Headers $headers
    Write-Host "PASS - Handled page 0"
    $testResults += @{ Test = "Pagination Page 0"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Pagination Page 0"; Status = "FAIL" }
}
Write-Host ""

# TEST 8: Pagination With Negative Page
Write-Host "Test 8: Pagination With Negative Page"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads?page=-1&limit=10" -Method Get -Headers $headers
    Write-Host "PASS - Handled negative page"
    $testResults += @{ Test = "Pagination Negative Page"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Pagination Negative Page"; Status = "FAIL" }
}
Write-Host ""

# TEST 9: Pagination With Very Large Limit
Write-Host "Test 9: Pagination With Large Limit (1000)"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads?page=1&limit=1000" -Method Get -Headers $headers
    Write-Host "PASS - Handled large limit"
    $testResults += @{ Test = "Pagination Large Limit"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Pagination Large Limit"; Status = "FAIL" }
}
Write-Host ""

# TEST 10: Empty Search Query
Write-Host "Test 10: Search With Empty Query"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/search?q=" -Method Get -Headers $headers
    Write-Host "PASS - Handled empty search"
    $testResults += @{ Test = "Empty Search Query"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Empty Search Query"; Status = "FAIL" }
}
Write-Host ""

# TEST 11: Search With Special Characters
Write-Host "Test 11: Search With Special Characters"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/search?q=%3Cscript%3E" -Method Get -Headers $headers
    Write-Host "PASS - Handled special chars in search"
    $testResults += @{ Test = "Search Special Chars"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Search Special Chars"; Status = "FAIL" }
}
Write-Host ""

# TEST 12: Mark Already Read Message
Write-Host "Test 12: Mark Already Read Message Again"
$messageBody = @{
    content = "Test message for read status"
} | ConvertTo-Json

try {
    $msgResponse = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method Post -Headers $headers -Body $messageBody
    $messageId = $msgResponse.data.message.id
    
    # Mark as read first time
    $response1 = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/messages/$messageId/read" -Method Patch -Headers $headers
    
    # Mark as read second time
    $response2 = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/messages/$messageId/read" -Method Patch -Headers $headers
    
    Write-Host "PASS - Handled duplicate read marking"
    $testResults += @{ Test = "Duplicate Read Mark"; Status = "PASS" }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)"
    $testResults += @{ Test = "Duplicate Read Mark"; Status = "FAIL" }
}
Write-Host ""

# TEST 13: Update Thread With Invalid Status
Write-Host "Test 13: Update Thread With Invalid Status"
$invalidStatusBody = @{
    status = "invalid_status"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId" -Method Patch -Headers $headers -Body $invalidStatusBody
    Write-Host "FAIL - Should have rejected invalid status"
    $testResults += @{ Test = "Invalid Thread Status"; Status = "FAIL" }
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "PASS - Correctly rejected invalid status"
        $testResults += @{ Test = "Invalid Thread Status"; Status = "PASS" }
    } else {
        Write-Host "FAIL - Wrong error: $($_.Exception.Message)"
        $testResults += @{ Test = "Invalid Thread Status"; Status = "FAIL" }
    }
}
Write-Host ""

# TEST 14: Send Message to Archived Thread
Write-Host "Test 14: Send Message to Archived Thread"
try {
    # Archive the thread
    $archiveResponse = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId" -Method Delete -Headers $headers
    
    # Try to send message to archived thread
    $msgBody = @{
        content = "Message to archived thread"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method Post -Headers $headers -Body $msgBody
    Write-Host "FAIL - Should have rejected message to archived thread"
    $testResults += @{ Test = "Message to Archived Thread"; Status = "FAIL" }
} catch {
    if ($_.Exception.Response.StatusCode -eq 400 -or $_.Exception.Response.StatusCode -eq 404) {
        Write-Host "PASS - Correctly rejected message to archived thread"
        $testResults += @{ Test = "Message to Archived Thread"; Status = "PASS" }
    } else {
        Write-Host "FAIL - Wrong error: $($_.Exception.Message)"
        $testResults += @{ Test = "Message to Archived Thread"; Status = "FAIL" }
    }
}
Write-Host ""

# TEST 15: No Authentication Token
Write-Host "Test 15: Request Without Authentication"
$noAuthHeaders = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads" -Method Get -Headers $noAuthHeaders
    Write-Host "FAIL - Should have returned 401"
    $testResults += @{ Test = "No Authentication"; Status = "FAIL" }
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "PASS - Correctly returned 401"
        $testResults += @{ Test = "No Authentication"; Status = "PASS" }
    } else {
        Write-Host "FAIL - Wrong error: $($_.Exception.Message)"
        $testResults += @{ Test = "No Authentication"; Status = "FAIL" }
    }
}
Write-Host ""

# Summary
Write-Host "========================================"
Write-Host "EDGE CASE TEST SUMMARY"
Write-Host "========================================"
$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "Total: $($testResults.Count)"
Write-Host "Passed: $passCount"
Write-Host "Failed: $failCount"
Write-Host ""
$testResults | Format-Table -AutoSize
