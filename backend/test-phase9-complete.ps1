# Phase 9: Invoice Management - Complete Test Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 9: Invoice Management Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000/api"
$token = ""
$brandId = ""
$clientId = ""
$invoiceId = ""

# Test 1: Register User
Write-Host "Test 1: Register User" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body (Get-Content test-register-phase9.json) -ContentType "application/json"
    Write-Host "PASS - User registered" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Login
Write-Host "`nTest 2: Login User" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (Get-Content test-login-phase9.json) -ContentType "application/json"
    $token = $response.data.accessToken
    Write-Host "PASS - Login successful" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 3: Create Brand
Write-Host "`nTest 3: Create Brand" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/brands" -Method Post -Headers $headers -Body (Get-Content test-create-brand-phase9.json)
    $brandId = $response.data.brand.id
    Write-Host "PASS - Brand created: $brandId" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test 4: Create Client
Write-Host "`nTest 4: Create Client" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method Post -Headers $headers -Body (Get-Content test-create-client-phase9.json)
    $clientId = $response.data.client.id
    Write-Host "PASS - Client created: $clientId" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test 5: Create Invoice with Items
Write-Host "`nTest 5: Create Invoice with Items" -ForegroundColor Yellow
try {
    $invoiceData = Get-Content test-create-invoice.json | ConvertFrom-Json
    $invoiceData.client_id = $clientId
    $invoiceJson = $invoiceData | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices" -Method Post -Headers $headers -Body $invoiceJson -ContentType "application/json"
    $invoiceId = $response.data.invoice.id
    $invoiceNumber = $response.data.invoice.invoice_number
    Write-Host "PASS - Invoice created: $invoiceNumber" -ForegroundColor Green
    Write-Host "  Total: `$$($response.data.invoice.total_amount)" -ForegroundColor Cyan
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Get All Invoices
Write-Host "`nTest 6: Get All Invoices" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices" -Method Get -Headers $headers
    Write-Host "PASS - Retrieved $($response.results) invoices" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Get Single Invoice
Write-Host "`nTest 7: Get Single Invoice" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$invoiceId" -Method Get -Headers $headers
    Write-Host "PASS - Invoice details retrieved" -ForegroundColor Green
    Write-Host "  Invoice: $($response.data.invoice.invoice_number)" -ForegroundColor Cyan
    Write-Host "  Client: $($response.data.invoice.client_name)" -ForegroundColor Cyan
    Write-Host "  Items: $($response.data.items.Count)" -ForegroundColor Cyan
    Write-Host "  Subtotal: `$$($response.data.invoice.subtotal)" -ForegroundColor Cyan
    Write-Host "  Tax: `$$($response.data.invoice.tax_amount)" -ForegroundColor Cyan
    Write-Host "  Total: `$$($response.data.invoice.total_amount)" -ForegroundColor Cyan
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Update Invoice
Write-Host "`nTest 8: Update Invoice" -ForegroundColor Yellow
try {
    $updateData = @{
        notes = "Updated: Payment terms extended"
        status = "sent"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$invoiceId" -Method Patch -Headers $headers -Body $updateData -ContentType "application/json"
    Write-Host "PASS - Invoice updated" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Add Invoice Item
Write-Host "`nTest 9: Add Invoice Item" -ForegroundColor Yellow
try {
    $itemData = @{
        description = "Additional Consulting Hours"
        quantity = 5
        unit_price = 150.00
        tax_rate = 8.5
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$invoiceId/items" -Method Post -Headers $headers -Body $itemData -ContentType "application/json"
    Write-Host "PASS - Item added" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 10: Record Payment
Write-Host "`nTest 10: Record Payment" -ForegroundColor Yellow
try {
    $paymentData = @{
        amount = 2500.00
        payment_method = "bank_transfer"
        payment_status = "completed"
        transaction_id = "TXN-" + (Get-Random -Minimum 10000 -Maximum 99999)
        notes = "Partial payment received"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$invoiceId/payments" -Method Post -Headers $headers -Body $paymentData -ContentType "application/json"
    Write-Host "PASS - Payment recorded" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 11: Get Payment History
Write-Host "`nTest 11: Get Payment History" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$invoiceId/payments" -Method Get -Headers $headers
    Write-Host "PASS - Retrieved $($response.results) payments" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 12: Get Invoice Statistics
Write-Host "`nTest 12: Get Invoice Statistics" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/stats" -Method Get -Headers $headers
    Write-Host "PASS - Statistics retrieved" -ForegroundColor Green
    Write-Host "  Total Invoices: $($response.data.stats.total_invoices)" -ForegroundColor Cyan
    Write-Host "  Total Billed: `$$($response.data.stats.total_billed)" -ForegroundColor Cyan
    Write-Host "  Total Paid: `$$($response.data.stats.total_paid)" -ForegroundColor Cyan
    Write-Host "  Outstanding: `$$($response.data.stats.total_outstanding)" -ForegroundColor Cyan
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 13: Get Overdue Invoices
Write-Host "`nTest 13: Get Overdue Invoices" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/overdue" -Method Get -Headers $headers
    Write-Host "PASS - Retrieved $($response.results) overdue invoices" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 14: Filter Invoices by Status
Write-Host "`nTest 14: Filter Invoices by Status" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices?status=sent" -Method Get -Headers $headers
    Write-Host "PASS - Retrieved $($response.results) sent invoices" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 15: Filter Invoices by Client
Write-Host "`nTest 15: Filter Invoices by Client" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices?client_id=$clientId" -Method Get -Headers $headers
    Write-Host "PASS - Retrieved $($response.results) invoices for client" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Phase 9 Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nTest Data:" -ForegroundColor Yellow
Write-Host "  Brand ID: $brandId" -ForegroundColor White
Write-Host "  Client ID: $clientId" -ForegroundColor White
Write-Host "  Invoice ID: $invoiceId" -ForegroundColor White
Write-Host "  Token: $token" -ForegroundColor White
