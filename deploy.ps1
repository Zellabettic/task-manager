# PowerShell script to deploy to Azure Static Web Apps
# Usage: .\deploy.ps1 -AppName "your-app-name" -ResourceGroup "task-manager-rg" -DeploymentToken "your-token"

param(
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$DeploymentToken
)

Write-Host "Deploying Task Manager to Azure Static Web Apps..." -ForegroundColor Green
Write-Host "App Name: $AppName" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
try {
    $azVersion = az --version
    Write-Host "Azure CLI found" -ForegroundColor Green
} catch {
    Write-Host "Azure CLI not found. Please install it from: https://aka.ms/installazurecliwindows" -ForegroundColor Red
    exit 1
}

# Check if logged in
try {
    $account = az account show 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Not logged in to Azure. Logging in..." -ForegroundColor Yellow
        az login
    } else {
        Write-Host "Already logged in to Azure" -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking Azure login status" -ForegroundColor Red
    exit 1
}

# Deploy
Write-Host ""
Write-Host "Deploying files..." -ForegroundColor Yellow
az staticwebapp deploy `
    --name $AppName `
    --resource-group $ResourceGroup `
    --source-location . `
    --deployment-token $DeploymentToken

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "Your app should be available at: https://$AppName.azurestaticapps.net" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Deployment failed. Check the error messages above." -ForegroundColor Red
}

