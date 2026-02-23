# Phase 7 Document Management - Complete Test Suite
# Run this script to test all document management endpoints

$baseUrl = "http://localhost:5000"
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4NjNmNTc2LTZlNGYtNDY1Zi1hZTNkLWU4NGE0ZGQ2OTI5NyIsImlhdCI6MTc3MTI5NTQ1MywiZXhwIjoxNzcxOTAwMjUzfQ.uSvnbfgqwkuEf_w-mNITu5OR21aB9t3YSC2J2EbcvuE"
$brandId = "094c39e6-6d4e-4639-951a-5c890f9fd9af"
$documentId = "c2221223-ac36-48a9-9216-0433694327f7"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 7: Document Management Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 4: Update Document
Write-Host "TEST 4: Update Document Metadata..." -ForegroundColor Yellow
$updateBody = @{
    name = "Updated Test Document"
    description = "Updated description for testing"
    category = "report"
    tags = @("test", "phase7", "updated")
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/documents/$brandId/$documentId" `
        -Method PATCH `
        -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} `
        -Body $updateBody
    Write-Host "✅ PASSED - Document updated successfully" -ForegroundColor Green
    Write-Host "   New name: $($response.data.document.name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Get Document Statistics
Write-Host "TEST 5: Get Document Statistics..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/documents/$brandId/stats" `
        -Method GET `
        -Headers @{Authorization="Bearer $token"}
    Write-Host "✅ PASSED - Statistics retrieved" -ForegroundColor Green
    Write-Host "   Total documents: $($response.data.stats.total_documents)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Download Document (track download)
Write-Host "TEST 6: Download Document..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "$baseUrl/api/documents/$brandId/$documentId/download" `
        -Method GET `
        -Headers @{Authorization="Bearer $token"} `
        -OutFile "downloaded-test.txt"
    Write-Host "✅ PASSED - Document downloaded successfully" -ForegroundColor Green
    Write-Host "   File saved as: downloaded-test.txt" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Share Document with User
Write-Host "TEST 7: Share Document..." -ForegroundColor Yellow
$shareBody = @{
    shared_with_user_id = "9863f576-6e4f-465f-ae3d-e84a4dd69297"
    permission = "download"
    can_reshare = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/documents/$brandId/$documentId/share" `
        -Method POST `
        -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} `
        -Body $shareBody
    Write-Host "✅ PASSED - Document shared successfully" -ForegroundColor Green
    $script:shareId = $response.data.share.id
    Write-Host "   Share ID: $shareId" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Get Document Shares
Write-Host "TEST 8: Get Document Shares..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/documents/$brandId/$documentId/shares" `
        -Method GET `
        -Headers @{Authorization="Bearer $token"}
    Write-Host "✅ PASSED - Shares retrieved" -ForegroundColor Green
    Write-Host "   Total shares: $($response.results)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Suite Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Some tests may require additional setup (clients, projects, etc.)" -ForegroundColor Yellow
Write-Host "Run individual curl commands for detailed testing" -ForegroundColor Yellow
