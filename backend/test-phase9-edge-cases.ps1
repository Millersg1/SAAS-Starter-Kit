# Phase 9: Invoice Management - Edge Case Testing
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 9: Edge Case & Error Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000/api"
$token = ""
$brandId = ""
$clientId = ""
$invoiceId = ""
$itemId = ""

# Setup: Login to get token
Write-Host "Setup: Logging in..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (Get-Content test-login-phase9.json) -ContentType "application/json"
    $token = $response.data.accessToken
    Write-Host "PASS - Login successful" -ForegroundColor Green
} catch {
    Write-Host "FAIL - Cannot proceed without authentication" -ForegroundColor Red
    exit
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Get existing brand and client
Write-Host "`nSetup: Getting existing brand..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/brands" -Method Get -Headers $headers
    $brandId = $response.data.brands[0].id
    Write-Host "PASS - Brand ID: $brandId" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`nSetup: Getting existing client..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method Get -Headers $headers
    $clientId = $response.data.clients[0].id
    Write-Host "PASS - Client ID: $clientId" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "EDGE CASE TESTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: Create invoice with negative amount
Write-Host "`nTest 1: Create invoice with negative unit price (should fail)" -ForegroundColor Yellow
try {
    $invalidData = @{
        client_id = $clientId
        due_date = "2026-03-17"
        items = @(
            @{
                description = "Invalid negative price"
                quantity = 1
                unit_price = -100.00
                tax_rate = 8.5
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices" -Method Post -Headers $headers -Body $invalidData -ContentType "application/json"
    Write-Host "FAIL - Should have rejected negative price" -ForegroundColor Red
} catch {
    Write-Host "PASS - Correctly rejected: $($_.Exception.Message)" -ForegroundColor Green
}

# Test 2: Create invoice with past due date
Write-Host "`nTest 2: Create invoice with past due date (should create as overdue)" -ForegroundColor Yellow
try {
    $pastDueData = @{
        client_id = $clientId
        due_date = "2020-01-01"
        items = @(
            @{
                description = "Past due invoice"
                quantity = 1
                unit_price = 100.00
                tax_rate = 0
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices" -Method Post -Headers $headers -Body $pastDueData -ContentType "application/json"
    Write-Host "PASS - Invoice created with past due date" -ForegroundColor Green
    $pastDueInvoiceId = $response.data.invoice.id
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Create invoice without items
Write-Host "`nTest 3: Create invoice without items" -ForegroundColor Yellow
try {
    $noItemsData = @{
        client_id = $clientId
        due_date = "2026-04-01"
        items = @()
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices" -Method Post -Headers $headers -Body $noItemsData -ContentType "application/json"
    Write-Host "PASS - Invoice created without items (Total: $($response.data.invoice.total_amount))" -ForegroundColor Green
    $emptyInvoiceId = $response.data.invoice.id
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Try to access another brand's invoice (unauthorized)
Write-Host "`nTest 4: Try to access non-existent brand's invoices (should fail)" -ForegroundColor Yellow
try {
    $fakeBrandId = "00000000-0000-0000-0000-000000000000"
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$fakeBrandId/invoices" -Method Get -Headers $headers
    Write-Host "FAIL - Should have been unauthorized" -ForegroundColor Red
} catch {
    Write-Host "PASS - Correctly blocked unauthorized access" -ForegroundColor Green
}

# Test 5: Create invoice with zero amount
Write-Host "`nTest 5: Create invoice with zero unit price" -ForegroundColor Yellow
try {
    $zeroData = @{
        client_id = $clientId
        due_date = "2026-04-01"
        items = @(
            @{
                description = "Free service"
                quantity = 1
                unit_price = 0.00
                tax_rate = 0
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices" -Method Post -Headers $headers -Body $zeroData -ContentType "application/json"
    Write-Host "PASS - Zero-amount invoice created (Total: $($response.data.invoice.total_amount))" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Update invoice item
Write-Host "`nTest 6: Update invoice item" -ForegroundColor Yellow
try {
    # Get an invoice with items
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices" -Method Get -Headers $headers
    $testInvoiceId = $response.data.invoices[0].id
    
    # Get invoice details to get item ID
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$testInvoiceId" -Method Get -Headers $headers
    $itemId = $response.data.items[0].id
    
    $updateItemData = @{
        quantity = 10
        unit_price = 999.99
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$testInvoiceId/items/$itemId" -Method Patch -Headers $headers -Body $updateItemData -ContentType "application/json"
    Write-Host "PASS - Item updated successfully" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Delete invoice item
Write-Host "`nTest 7: Delete invoice item" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$testInvoiceId/items/$itemId" -Method Delete -Headers $headers
    Write-Host "PASS - Item deleted successfully" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Record multiple payments
Write-Host "`nTest 8: Record multiple payments on same invoice" -ForegroundColor Yellow
try {
    # Create a new invoice for payment testing
    $paymentTestData = @{
        client_id = $clientId
        due_date = "2026-04-01"
        items = @(
            @{
                description = "Payment test service"
                quantity = 1
                unit_price = 1000.00
                tax_rate = 0
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices" -Method Post -Headers $headers -Body $paymentTestData -ContentType "application/json"
    $paymentTestInvoiceId = $response.data.invoice.id
    
    # Record first payment
    $payment1 = @{
        amount = 300.00
        payment_method = "credit_card"
        payment_status = "completed"
        transaction_id = "TXN-001"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$paymentTestInvoiceId/payments" -Method Post -Headers $headers -Body $payment1 -ContentType "application/json"
    
    # Record second payment
    $payment2 = @{
        amount = 400.00
        payment_method = "bank_transfer"
        payment_status = "completed"
        transaction_id = "TXN-002"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$paymentTestInvoiceId/payments" -Method Post -Headers $headers -Body $payment2 -ContentType "application/json"
    
    # Get invoice to check status
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$paymentTestInvoiceId" -Method Get -Headers $headers
    Write-Host "PASS - Multiple payments recorded" -ForegroundColor Green
    Write-Host "  Total: `$$($response.data.invoice.total_amount)" -ForegroundColor Cyan
    Write-Host "  Paid: `$$($response.data.invoice.amount_paid)" -ForegroundColor Cyan
    Write-Host "  Due: `$$($response.data.invoice.amount_due)" -ForegroundColor Cyan
    Write-Host "  Status: $($response.data.invoice.status)" -ForegroundColor Cyan
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Overpayment scenario
Write-Host "`nTest 9: Record payment exceeding invoice total" -ForegroundColor Yellow
try {
    $overpayment = @{
        amount = 500.00
        payment_method = "cash"
        payment_status = "completed"
        transaction_id = "TXN-003"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$paymentTestInvoiceId/payments" -Method Post -Headers $headers -Body $overpayment -ContentType "application/json"
    
    # Check final status
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$paymentTestInvoiceId" -Method Get -Headers $headers
    Write-Host "PASS - Overpayment recorded" -ForegroundColor Green
    Write-Host "  Total: `$$($response.data.invoice.total_amount)" -ForegroundColor Cyan
    Write-Host "  Paid: `$$($response.data.invoice.amount_paid)" -ForegroundColor Cyan
    Write-Host "  Due: `$$($response.data.invoice.amount_due)" -ForegroundColor Cyan
    Write-Host "  Status: $($response.data.invoice.status)" -ForegroundColor Cyan
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 10: Different tax rates
Write-Host "`nTest 10: Create invoice with different tax rates per item" -ForegroundColor Yellow
try {
    $mixedTaxData = @{
        client_id = $clientId
        due_date = "2026-04-01"
        items = @(
            @{
                description = "Service A (8.5% tax)"
                quantity = 1
                unit_price = 100.00
                tax_rate = 8.5
            },
            @{
                description = "Service B (10% tax)"
                quantity = 1
                unit_price = 200.00
                tax_rate = 10.0
            },
            @{
                description = "Service C (no tax)"
                quantity = 1
                unit_price = 150.00
                tax_rate = 0
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices" -Method Post -Headers $headers -Body $mixedTaxData -ContentType "application/json"
    Write-Host "PASS - Mixed tax rates invoice created" -ForegroundColor Green
    Write-Host "  Subtotal: `$$($response.data.invoice.subtotal)" -ForegroundColor Cyan
    Write-Host "  Tax: `$$($response.data.invoice.tax_amount)" -ForegroundColor Cyan
    Write-Host "  Total: `$$($response.data.invoice.total_amount)" -ForegroundColor Cyan
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 11: Update invoice to cancelled status
Write-Host "`nTest 11: Cancel an invoice" -ForegroundColor Yellow
try {
    $cancelData = @{
        status = "cancelled"
        notes = "Client requested cancellation"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$emptyInvoiceId" -Method Patch -Headers $headers -Body $cancelData -ContentType "application/json"
    Write-Host "PASS - Invoice cancelled" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 12: Delete invoice
Write-Host "`nTest 12: Delete an invoice" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$pastDueInvoiceId" -Method Delete -Headers $headers
    Write-Host "PASS - Invoice deleted" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 13: Try to get deleted invoice
Write-Host "`nTest 13: Try to access deleted invoice (should fail)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices/$pastDueInvoiceId" -Method Get -Headers $headers
    Write-Host "FAIL - Should not be able to access deleted invoice" -ForegroundColor Red
} catch {
    Write-Host "PASS - Correctly blocked access to deleted invoice" -ForegroundColor Green
}

# Test 14: Large quantity calculation
Write-Host "`nTest 14: Create invoice with large quantities" -ForegroundColor Yellow
try {
    $largeQtyData = @{
        client_id = $clientId
        due_date = "2026-04-01"
        items = @(
            @{
                description = "Bulk service"
                quantity = 1000
                unit_price = 2.50
                tax_rate = 8.5
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices" -Method Post -Headers $headers -Body $largeQtyData -ContentType "application/json"
    Write-Host "PASS - Large quantity invoice created" -ForegroundColor Green
    Write-Host "  Quantity: 1000 × `$2.50 = `$$($response.data.invoice.subtotal)" -ForegroundColor Cyan
    Write-Host "  Total: `$$($response.data.invoice.total_amount)" -ForegroundColor Cyan
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 15: Decimal quantity
Write-Host "`nTest 15: Create invoice with decimal quantity" -ForegroundColor Yellow
try {
    $decimalQtyData = @{
        client_id = $clientId
        due_date = "2026-04-01"
        items = @(
            @{
                description = "Hourly service"
                quantity = 2.5
                unit_price = 150.00
                tax_rate = 8.5
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$baseUrl/invoices/$brandId/invoices" -Method Post -Headers $headers -Body $decimalQtyData -ContentType "application/json"
    Write-Host "PASS - Decimal quantity invoice created" -ForegroundColor Green
    Write-Host "  Quantity: 2.5 × `$150.00 = `$$($response.data.invoice.subtotal)" -ForegroundColor Cyan
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Edge Case Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
