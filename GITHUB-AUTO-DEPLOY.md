# Automatic GitHub Deployment

This guide shows you how to automatically update your GitHub repository from your local workspace.

## Quick Start

### Option 1: Double-Click Deployment (Easiest)

1. **Double-click** `deploy-github.bat`
2. **Enter a commit message** (or press Enter for default)
3. **Wait for deployment** - your changes will be pushed to GitHub!

### Option 2: PowerShell Script

1. **Right-click** `deploy-github.ps1` → **"Run with PowerShell"**
2. Or open PowerShell and run:
   ```powershell
   .\deploy-github.ps1 -Message "Your commit message"
   ```

## First Time Setup

If this is your first time, the script will:

1. **Initialize Git** (if not already done)
2. **Ask for your GitHub repository URL**
   - Example: `https://github.com/zellabettic/task-manager.git`
3. **Set up the remote** connection

## Authentication

If you get authentication errors when pushing:

### Option A: GitHub Desktop (Recommended)
1. Download: https://desktop.github.com
2. Sign in with your GitHub account
3. Use GitHub Desktop to push changes instead

### Option B: Personal Access Token
1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Select scopes: **`repo`** (full control of private repositories)
4. Copy the token
5. When Git asks for password, use the token instead

### Option C: Configure Git Credentials
```powershell
git config --global credential.helper wincred
```

## What Gets Deployed

The script automatically:
- ✅ Adds all files (respects `.gitignore`)
- ✅ Commits with timestamp
- ✅ Pushes to GitHub
- ✅ Updates GitHub Pages (automatic, takes 1-2 minutes)

## Files Excluded

These files are NOT deployed (in `.gitignore`):
- `tasks.json` (your local task data)
- `.DS_Store`, `Thumbs.db` (OS files)
- Editor files (`.vscode/`, `.idea/`, etc.)

## Troubleshooting

### "Git not found"
- Install Git: https://git-scm.com/downloads
- Restart your terminal/PowerShell

### "No remote repository configured"
- Run: `git remote add origin https://github.com/zellabettic/task-manager.git`
- Or use the script - it will prompt you

### "Authentication failed"
- See "Authentication" section above
- Or use GitHub Desktop for easier authentication

### "Nothing to commit"
- No changes detected - this is normal if you haven't modified any files

### Changes not showing on GitHub Pages
- Wait 1-2 minutes after pushing
- Hard refresh browser (Ctrl+Shift+R)
- Check GitHub repository → Settings → Pages to verify deployment

## Workflow

1. **Make changes** to your files (e.g., edit `auth.js`)
2. **Run** `deploy-github.bat` or `deploy-github.ps1`
3. **Wait 1-2 minutes** for GitHub Pages to update
4. **Refresh** your browser to see changes

## Advanced: Automatic Deployment on Save

If you want changes to deploy automatically when you save files, you can:

1. **Use VS Code** with the "Git" extension
2. **Set up a file watcher** (requires additional setup)
3. **Use GitHub Desktop** with auto-commit (not recommended for production)

For now, the manual deployment script is the safest and most reliable option.

