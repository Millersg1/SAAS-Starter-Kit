# Phase 8: Messaging System - Complete Test Script
# Tests all messaging endpoints

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 8: Messaging System - Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000/api"
$testResults = @()

# Test user credentials (from Phase 7)
$loginEmail = "phase7@test.com"
$loginPassword = "Test123!@#"

Write-Host "Step 1: User Login" -ForegroundColor Yellow
$loginBody = @{
    email = $loginEmail
    password = $loginPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    $userId = $loginResponse.data.user.id
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "  User ID: $userId" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Set authorization header
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Use existing brand from Phase 7
$brandId = "094c39e6-6d4e-4639-951a-5c890f9fd9af"

Write-Host "Using Brand ID: $brandId" -ForegroundColor Gray
Write-Host ""

# ============================================
# TEST 1: Create Message Thread
# ============================================
Write-Host "Test 1: Create Message Thread" -ForegroundColor Yellow
$createThreadBody = Get-Content "test-create-thread.json" | ConvertFrom-Json | ConvertTo-Json

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads" -Method Post -Headers $headers -Body $createThreadBody
    $duration = (Get-Date) - $startTime
    
    $threadId = $response.data.thread.id
    Write-Host "✓ Thread created successfully" -ForegroundColor Green
    Write-Host "  Thread ID: $threadId" -ForegroundColor Gray
    Write-Host "  Subject: $($response.data.thread.subject)" -ForegroundColor Gray
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Create Thread"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Create Thread"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 2: Get All Threads
# ============================================
Write-Host "Test 2: Get All Threads" -ForegroundColor Yellow

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads" -Method Get -Headers $headers
    $duration = (Get-Date) - $startTime
    
    Write-Host "✓ Threads retrieved successfully" -ForegroundColor Green
    Write-Host "  Count: $($response.results)" -ForegroundColor Gray
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Get All Threads"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Get All Threads"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 3: Get Single Thread
# ============================================
Write-Host "Test 3: Get Single Thread" -ForegroundColor Yellow

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId" -Method Get -Headers $headers
    $duration = (Get-Date) - $startTime
    
    Write-Host "✓ Thread retrieved successfully" -ForegroundColor Green
    Write-Host "  Subject: $($response.data.thread.subject)" -ForegroundColor Gray
    Write-Host "  Status: $($response.data.thread.status)" -ForegroundColor Gray
    Write-Host "  Message Count: $($response.data.thread.message_count)" -ForegroundColor Gray
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Get Single Thread"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Get Single Thread"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 4: Send Message
# ============================================
Write-Host "Test 4: Send Message" -ForegroundColor Yellow
$sendMessageBody = Get-Content "test-send-message.json" | ConvertFrom-Json | ConvertTo-Json

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method Post -Headers $headers -Body $sendMessageBody
    $duration = (Get-Date) - $startTime
    
    $messageId = $response.data.message.id
    Write-Host "✓ Message sent successfully" -ForegroundColor Green
    Write-Host "  Message ID: $messageId" -ForegroundColor Gray
    Write-Host "  Content: $($response.data.message.content.Substring(0, [Math]::Min(50, $response.data.message.content.Length)))..." -ForegroundColor Gray
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Send Message"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Send Message"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 5: Get Thread Messages
# ============================================
Write-Host "Test 5: Get Thread Messages" -ForegroundColor Yellow

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method Get -Headers $headers
    $duration = (Get-Date) - $startTime
    
    Write-Host "✓ Messages retrieved successfully" -ForegroundColor Green
    Write-Host "  Count: $($response.results)" -ForegroundColor Gray
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Get Thread Messages"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Get Thread Messages"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 6: Send Another Message
# ============================================
Write-Host "Test 6: Send Another Message" -ForegroundColor Yellow
$message2Body = @{
    content = "This is a follow-up message. We should schedule a meeting to discuss the timeline."
} | ConvertTo-Json

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/messages" -Method Post -Headers $headers -Body $message2Body
    $duration = (Get-Date) - $startTime
    
    $message2Id = $response.data.message.id
    Write-Host "✓ Second message sent successfully" -ForegroundColor Green
    Write-Host "  Message ID: $message2Id" -ForegroundColor Gray
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Send Another Message"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Send Another Message"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 7: Get Unread Count
# ============================================
Write-Host "Test 7: Get Unread Count" -ForegroundColor Yellow

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/unread" -Method Get -Headers $headers
    $duration = (Get-Date) - $startTime
    
    Write-Host "✓ Unread count retrieved successfully" -ForegroundColor Green
    Write-Host "  Unread Count: $($response.data.unread_count)" -ForegroundColor Gray
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Get Unread Count"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Get Unread Count"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 8: Mark Message as Read
# ============================================
Write-Host "Test 8: Mark Message as Read" -ForegroundColor Yellow

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/messages/$messageId/read" -Method Patch -Headers $headers
    $duration = (Get-Date) - $startTime
    
    Write-Host "✓ Message marked as read" -ForegroundColor Green
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Mark Message as Read"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Mark Message as Read"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 9: Mark Thread as Read
# ============================================
Write-Host "Test 9: Mark All Thread Messages as Read" -ForegroundColor Yellow

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/read" -Method Patch -Headers $headers
    $duration = (Get-Date) - $startTime
    
    Write-Host "✓ Thread marked as read" -ForegroundColor Green
    Write-Host "  Messages marked: $($response.data.count)" -ForegroundColor Gray
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Mark Thread as Read"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Mark Thread as Read"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 10: Search Messages
# ============================================
Write-Host "Test 10: Search Messages" -ForegroundColor Yellow

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/search?q=project" -Method Get -Headers $headers
    $duration = (Get-Date) - $startTime
    
    Write-Host "✓ Messages searched successfully" -ForegroundColor Green
    Write-Host "  Results: $($response.results)" -ForegroundColor Gray
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Search Messages"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Search Messages"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 11: Update Thread
# ============================================
Write-Host "Test 11: Update Thread" -ForegroundColor Yellow
$updateThreadBody = @{
    subject = "Project Discussion - Website Redesign (Updated)"
    status = "active"
} | ConvertTo-Json

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId" -Method Patch -Headers $headers -Body $updateThreadBody
    $duration = (Get-Date) - $startTime
    
    Write-Host "✓ Thread updated successfully" -ForegroundColor Green
    Write-Host "  New Subject: $($response.data.thread.subject)" -ForegroundColor Gray
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Update Thread"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Update Thread"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 12: Get Thread Participants
# ============================================
Write-Host "Test 12: Get Thread Participants" -ForegroundColor Yellow

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId/participants" -Method Get -Headers $headers
    $duration = (Get-Date) - $startTime
    
    Write-Host "✓ Participants retrieved successfully" -ForegroundColor Green
    Write-Host "  Count: $($response.results)" -ForegroundColor Gray
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Get Thread Participants"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Get Thread Participants"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST 13: Archive Thread
# ============================================
Write-Host "Test 13: Archive Thread" -ForegroundColor Yellow

try {
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$baseUrl/messages/$brandId/threads/$threadId" -Method Delete -Headers $headers
    $duration = (Get-Date) - $startTime
    
    Write-Host "✓ Thread archived successfully" -ForegroundColor Green
    Write-Host "  Duration: $($duration.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    $testResults += @{
        Test = "Archive Thread"
        Status = "PASS"
        Duration = "$($duration.TotalMilliseconds)ms"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    $testResults += @{
        Test = "Archive Thread"
        Status = "FAIL"
        Duration = "N/A"
    }
}

# ============================================
# TEST SUMMARY
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $testResults.Count

Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""

# Display results table
$testResults | Format-Table -AutoSize

if ($failCount -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed. Please review the results above." -ForegroundColor Red
}

Write-Host ""
Write-Host "Test IDs for reference:" -ForegroundColor Gray
Write-Host "  Thread ID: $threadId" -ForegroundColor Gray
Write-Host "  Message ID: $messageId" -ForegroundColor Gray
if ($message2Id) {
    Write-Host "  Message 2 ID: $message2Id" -ForegroundColor Gray
}
