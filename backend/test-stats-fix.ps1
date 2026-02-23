# Test the stats fix end-to-end
$baseUrl = "http://localhost:5000/api"

Write-Host "=== Testing Stats Fix ===" -ForegroundColor Cyan

# Step 1: Register a fresh user
Write-Host "`n1. Registering new user..." -ForegroundColor Yellow
$regBody = @{
    name = "Stats Test User"
    email = "statsfix@example.com"
    password = "Password123!"
    role = "agency"
} | ConvertTo-Json

try {
    $reg = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $regBody
    $token = $reg.data.accessToken
    Write-Host "   ✅ Registered successfully" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0,30))..." -ForegroundColor Gray
} catch {
    # User might already exist, try login
    Write-Host "   User exists, logging in..." -ForegroundColor Yellow
    $loginBody = @{
        email = "statsfix@example.com"
        password = "Password123!"
    } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $login.data.accessToken
    Write-Host "   ✅ Logged in successfully" -ForegroundColor Green
}

$headers = @{ Authorization = "Bearer $token" }

# Step 2: Create a brand
Write-Host "`n2. Creating brand..." -ForegroundColor Yellow
$brandBody = @{
    name = "Stats Test Brand"
    slug = "stats-test-brand-$(Get-Random -Maximum 9999)"
    description = "Brand for testing stats"
} | ConvertTo-Json

try {
    $brand = Invoke-RestMethod -Uri "$baseUrl/brands" -Method POST -ContentType "application/json" -Headers $headers -Body $brandBody
    $brandId = $brand.data.brand.id
    Write-Host "   ✅ Brand created: $($brand.data.brand.name)" -ForegroundColor Green
    Write-Host "   Brand ID: $brandId" -ForegroundColor Gray
} catch {
    # Get existing brand
    $brands = Invoke-RestMethod -Uri "$baseUrl/brands" -Method GET -Headers $headers
    $brandId = $brands.data.brands[0].id
    Write-Host "   ✅ Using existing brand ID: $brandId" -ForegroundColor Green
}

# Step 3: Create a client
Write-Host "`n3. Creating client..." -ForegroundColor Yellow
$clientBody = @{
    name = "Test Client"
    email = "testclient$(Get-Random -Maximum 9999)@example.com"
    status = "active"
    client_type = "regular"
} | ConvertTo-Json

$client = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId" -Method POST -ContentType "application/json" -Headers $headers -Body $clientBody
Write-Host "   ✅ Client created: $($client.data.client.name)" -ForegroundColor Green
Write-Host "   Client ID: $($client.data.client.id)" -ForegroundColor Gray

# Step 4: Get stats and verify structure
Write-Host "`n4. Fetching client stats..." -ForegroundColor Yellow
$statsResponse = Invoke-RestMethod -Uri "$baseUrl/clients/$brandId/stats" -Method GET -Headers $headers

Write-Host "   Raw API response structure:" -ForegroundColor Gray
$statsResponse | ConvertTo-Json -Depth 5

Write-Host "`n5. Verifying stats values..." -ForegroundColor Yellow
$stats = $statsResponse.data.stats
Write-Host "   total_clients: $($stats.total_clients) (type: $($stats.total_clients.GetType().Name))" -ForegroundColor White
Write-Host "   active_clients: $($stats.active_clients) (type: $($stats.active_clients.GetType().Name))" -ForegroundColor White
Write-Host "   portal_enabled: $($stats.portal_enabled)" -ForegroundColor White
Write-Host "   vip_clients: $($stats.vip_clients)" -ForegroundColor White

# Step 5: Verify the fix - parse as integers
$totalInt = [int]$stats.total_clients
$activeInt = [int]$stats.active_clients
Write-Host "`n6. After parseInt conversion:" -ForegroundColor Yellow
Write-Host "   total_clients (int): $totalInt" -ForegroundColor Green
Write-Host "   active_clients (int): $activeInt" -ForegroundColor Green

if ($totalInt -gt 0) {
    Write-Host "`n✅ FIX VERIFIED: Stats are returning correct values!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Stats still showing 0 - further investigation needed" -ForegroundColor Red
}
