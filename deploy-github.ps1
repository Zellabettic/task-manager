# PowerShell script to automatically deploy to GitHub Pages
# Usage: .\deploy-github.ps1 -Message "Description of changes"

param(
    [Parameter(Mandatory=$false)]
    [string]$Message = "Update task manager"
)

$ErrorActionPreference = "Stop"

Write-Host "Deploying Task Manager to GitHub..." -ForegroundColor Green
Write-Host ""

# Get the current directory
$projectPath = $PSScriptRoot
if (-not $projectPath) {
    $projectPath = Get-Location
}

Set-Location $projectPath

# Check if Git is installed
try {
    $gitVersion = git --version
    Write-Host "Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "Git not found. Please install Git from: https://git-scm.com/downloads" -ForegroundColor Red
    exit 1
}

# Check if this is a git repository
$isGitRepo = Test-Path ".git"
if (-not $isGitRepo) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
    
    Write-Host ""
    Write-Host "⚠️  First time setup required!" -ForegroundColor Yellow
    Write-Host "Please provide your GitHub repository URL:" -ForegroundColor Yellow
    $repoUrl = Read-Host "Enter GitHub URL (e.g., https://github.com/zellabettic/task-manager.git)"
    
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Host "Remote added: $repoUrl" -ForegroundColor Green
    } else {
        Write-Host "No URL provided. You'll need to add the remote manually:" -ForegroundColor Yellow
        Write-Host "  git remote add origin https://github.com/zellabettic/task-manager.git" -ForegroundColor Cyan
    }
}

# Check remote
try {
    $remoteUrl = git remote get-url origin 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Remote repository: $remoteUrl" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  No remote repository configured." -ForegroundColor Yellow
    Write-Host "Add it with: git remote add origin https://github.com/zellabettic/task-manager.git" -ForegroundColor Cyan
}

# Add all files (excluding those in .gitignore)
Write-Host ""
Write-Host "Staging files..." -ForegroundColor Yellow
git add .

# Check if there are changes
$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit 0
}

# Show what will be committed
Write-Host ""
Write-Host "Files to be committed:" -ForegroundColor Cyan
git status --short

# Commit
Write-Host ""
Write-Host "Committing changes..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "$Message - $timestamp"
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "Commit failed. Check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Committed successfully" -ForegroundColor Green

# Push to GitHub
Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
$originalErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"  # Temporarily change to allow exit code checking
git push -u origin main
$pushSuccess = $LASTEXITCODE -eq 0
$ErrorActionPreference = $originalErrorAction  # Restore

if ($pushSuccess) {
    Write-Host ""
    Write-Host "✓ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your changes will be live on GitHub Pages in 1-2 minutes." -ForegroundColor Cyan
    Write-Host "URL: https://zellabettic.github.io/task-manager" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Push failed. You may need to:" -ForegroundColor Yellow
    Write-Host "  1. Set up authentication (GitHub Personal Access Token)" -ForegroundColor Cyan
    Write-Host "  2. Check your remote URL: git remote -v" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "If you see authentication errors:" -ForegroundColor Yellow
    Write-Host "  - Use GitHub Desktop instead" -ForegroundColor Cyan
    Write-Host "  - Set up a Personal Access Token: https://github.com/settings/tokens" -ForegroundColor Cyan
    Write-Host "  - Configure Git credentials: git config --global credential.helper wincred" -ForegroundColor Cyan
}

