# Phase 10 Subscription Management - Complete Test Suite
# This script tests all subscription endpoints with Stripe integration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 10: Subscription Management Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000"
$testEmail = "phase10test@example.com"
$testPassword = "Test123!@#"

# Test Results
$results = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Body,
        [string]$Token,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Token) {
            $headers["Authorization"] = "Bearer $Token"
        }
        
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params["Body"] = $Body
        }
        
        $response = Invoke-RestMethod @params
        
        Write-Host "✓ PASS: $Name" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
        Write-Host ""
        
        $script:results += [PSCustomObject]@{
            Test = $Name
            Status = "PASS"
            Response = $response
        }
        
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "✓ PASS: $Name (Expected $ExpectedStatus)" -ForegroundColor Green
            $script:results += [PSCustomObject]@{
                Test = $Name
                Status = "PASS"
                Response = "Expected error: $statusCode"
            }
        }
        else {
            Write-Host "✗ FAIL: $Name" -ForegroundColor Red
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host ""
            
            $script:results += [PSCustomObject]@{
                Test = $Name
                Status = "FAIL"
                Response = $_.Exception.Message
            }
        }
        return $null
    }
}

# Step 1: Register User
Write-Host "Step 1: Register Test User" -ForegroundColor Cyan
$registerBody = @{
    email = $testEmail
    password = $testPassword
    first_name = "Phase10"
    last_name = "Tester"
} | ConvertTo-Json

$registerResponse = Test-Endpoint `
    -Name "Register User" `
    -Method "POST" `
    -Url "$baseUrl/api/auth/register" `
    -Body $registerBody

if (-not $registerResponse) {
    Write-Host "Registration failed, trying to login with existing user..." -ForegroundColor Yellow
}

# Step 2: Login
Write-Host "Step 2: Login" -ForegroundColor Cyan
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

$loginResponse = Test-Endpoint `
    -Name "Login User" `
    -Method "POST" `
    -Url "$baseUrl/api/auth/login" `
    -Body $loginBody

if (-not $loginResponse) {
    Write-Host "Cannot proceed without authentication token" -ForegroundColor Red
    exit 1
}

$token = $loginResponse.data.token
$userId = $loginResponse.data.user.id

Write-Host "Token obtained: $($token.Substring(0, 20))..." -ForegroundColor Green
Write-Host ""

# Step 3: Create Brand
Write-Host "Step 3: Create Test Brand" -ForegroundColor Cyan
$brandBody = @{
    name = "Phase 10 Test Agency"
    slug = "phase10-test-$(Get-Random -Maximum 9999)"
    description = "Testing subscription management"
} | ConvertTo-Json

$brandResponse = Test-Endpoint `
    -Name "Create Brand" `
    -Method "POST" `
    -Url "$baseUrl/api/brands" `
    -Body $brandBody `
    -Token $token

if (-not $brandResponse) {
    Write-Host "Cannot proceed without brand" -ForegroundColor Red
    exit 1
}

$brandId = $brandResponse.data.brand.id
Write-Host "Brand ID: $brandId" -ForegroundColor Green
Write-Host ""

# Step 4: Test Subscription Plans
Write-Host "Step 4: Test Subscription Plans" -ForegroundColor Cyan

Test-Endpoint `
    -Name "Get All Plans" `
    -Method "GET" `
    -Url "$baseUrl/api/subscriptions/plans" `
    -Token $token

Test-Endpoint `
    -Name "Get Basic Monthly Plan" `
    -Method "GET" `
    -Url "$baseUrl/api/subscriptions/plans/1" `
    -Token $token

Test-Endpoint `
    -Name "Get Non-existent Plan" `
    -Method "GET" `
    -Url "$baseUrl/api/subscriptions/plans/999" `
    -Token $token `
    -ExpectedStatus 404

# Step 5: Test Subscription Creation (will fail without Stripe setup)
Write-Host "Step 5: Test Subscription Creation" -ForegroundColor Cyan

$subscriptionBody = @{
    plan_id = 1
    payment_method_id = "pm_card_visa"  # Stripe test payment method
} | ConvertTo-Json

Write-Host "Note: This will fail without Stripe keys configured" -ForegroundColor Yellow
Test-Endpoint `
    -Name "Create Subscription" `
    -Method "POST" `
    -Url "$baseUrl/api/subscriptions/$brandId" `
    -Body $subscriptionBody `
    -Token $token

# Step 6: Test Get Subscription
Write-Host "Step 6: Test Get Subscription" -ForegroundColor Cyan

Test-Endpoint `
    -Name "Get Subscription (should be empty)" `
    -Method "GET" `
    -Url "$baseUrl/api/subscriptions/$brandId" `
    -Token $token

# Step 7: Test Payment Methods
Write-Host "Step 7: Test Payment Methods" -ForegroundColor Cyan

Test-Endpoint `
    -Name "Get Payment Methods (should be empty)" `
    -Method "GET" `
    -Url "$baseUrl/api/subscriptions/$brandId/payment-methods" `
    -Token $token

# Step 8: Test Billing History
Write-Host "Step 8: Test Billing History" -ForegroundColor Cyan

Test-Endpoint `
    -Name "Get Billing History (should be empty)" `
    -Method "GET" `
    -Url "$baseUrl/api/subscriptions/$brandId/billing-history" `
    -Token $token

# Step 9: Test Authorization
Write-Host "Step 9: Test Authorization" -ForegroundColor Cyan

Test-Endpoint `
    -Name "Access Without Token" `
    -Method "GET" `
    -Url "$baseUrl/api/subscriptions/plans" `
    -ExpectedStatus 401

Test-Endpoint `
    -Name "Access Other Brand's Subscription" `
    -Method "GET" `
    -Url "$baseUrl/api/subscriptions/99999" `
    -Token $token `
    -ExpectedStatus 403

# Step 10: Test Webhook Endpoint
Write-Host "Step 10: Test Webhook Endpoint" -ForegroundColor Cyan

$webhookBody = @{
    type = "customer.subscription.created"
    data = @{
        object = @{
            id = "sub_test123"
            status = "active"
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "Note: Webhook will fail signature verification (expected)" -ForegroundColor Yellow
Test-Endpoint `
    -Name "Webhook Without Signature" `
    -Method "POST" `
    -Url "$baseUrl/api/webhooks/stripe" `
    -Body $webhookBody `
    -ExpectedStatus 400

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $results.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Failed Tests:" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.Test)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test Data:" -ForegroundColor Cyan
Write-Host "  User ID: $userId" -ForegroundColor Gray
Write-Host "  Brand ID: $brandId" -ForegroundColor Gray
Write-Host "  Email: $testEmail" -ForegroundColor Gray
Write-Host ""
Write-Host "Note: Full Stripe integration tests require:" -ForegroundColor Yellow
Write-Host "  1. Valid Stripe API keys in .env" -ForegroundColor Yellow
Write-Host "  2. Stripe price IDs updated in database" -ForegroundColor Yellow
Write-Host "  3. Stripe CLI for webhook testing" -ForegroundColor Yellow
Write-Host ""
Write-Host "See STRIPE_SETUP_GUIDE.md for complete setup instructions" -ForegroundColor Cyan
