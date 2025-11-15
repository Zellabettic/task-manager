# GitHub Pages Deployment Guide

## Step 1: Create a GitHub Account (if needed)

1. Go to https://github.com
2. Sign up for a free account (or sign in if you have one)

## Step 2: Create a New Repository

1. **Click the "+" icon** in the top right → **"New repository"**
2. **Repository name**: `task-manager` (or your preferred name)
3. **Description**: "Personal Task Manager with OneDrive Sync" (optional)
4. **Visibility**: 
   - **Public** (free, code visible but secure - recommended)
   - **Private** (requires GitHub Pro - check if your E3 includes it)
5. **DO NOT** check "Add a README file" (we'll upload your files)
6. **Click "Create repository"**

## Step 3: Upload Your Files

### Option A: Using GitHub Web Interface (Easiest)

1. After creating the repository, you'll see a page with upload instructions
2. **Click "uploading an existing file"** link
3. **Drag and drop** these files from your project folder:
   - `index.html`
   - `app.js`
   - `auth.js`
   - `onedrive.js`
   - `task-manager.js`
   - `ui.js`
   - `styles.css`
   - `staticwebapp.config.json` (optional, won't hurt)
4. **Scroll down** and click **"Commit changes"**

### Option B: Using GitHub Desktop (Recommended for future updates)

1. **Download GitHub Desktop**: https://desktop.github.com
2. **Install and sign in** with your GitHub account
3. **File → Add Local Repository**
4. **Browse** to your Task Manager folder
5. **Publish repository** (make it public or private)
6. **Commit and push** your files

### Option C: Using Git Command Line

1. **Install Git** if not installed: https://git-scm.com/downloads
2. **Open terminal/command prompt** in your project folder:
   ```bash
   cd "C:\Users\CleteAlbitz\OneDrive - Albitz Miloe & Associates, Inc\Task Manager"
   ```
3. **Initialize Git** (if not already done):
   ```bash
   git init
   ```
4. **Add files**:
   ```bash
   git add index.html app.js auth.js onedrive.js task-manager.js ui.js styles.css
   ```
5. **Commit**:
   ```bash
   git commit -m "Initial commit - Task Manager"
   ```
6. **Add remote** (replace YOUR_USERNAME with your GitHub username):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/task-manager.git
   ```
7. **Push**:
   ```bash
   git branch -M main
   git push -u origin main
   ```

## Step 4: Enable GitHub Pages

1. **Go to your repository** on GitHub
2. **Click "Settings"** (top menu)
3. **Scroll down** to **"Pages"** (left sidebar)
4. **Under "Source"**:
   - Select **"Deploy from a branch"**
   - Branch: **"main"** (or "master")
   - Folder: **"/ (root)"**
5. **Click "Save"**
6. **Wait 1-2 minutes** for GitHub to build your site
7. **Your site URL** will be: `https://YOUR_USERNAME.github.io/task-manager`

## Step 5: Update Azure App Registration

**CRITICAL**: You must add your GitHub Pages URL to allowed redirect URIs:

1. **Go to Azure Portal**: https://portal.azure.com
2. **Azure Active Directory** → **App registrations**
3. **Find your app** (Client ID: `621b9477-63ea-4607-b429-8bea6d11c3ab`)
4. **Click "Authentication"**
5. **Under "Single-page application"** → **"Redirect URIs"**
6. **Click "Add URI"** and add:
   - `https://YOUR_USERNAME.github.io/task-manager`
   - `https://YOUR_USERNAME.github.io/task-manager/` (with trailing slash)
7. **Click "Save"**

## Step 6: Test Your Deployment

1. **Go to your GitHub Pages URL**: `https://YOUR_USERNAME.github.io/task-manager`
2. **Click "Sign In"**
3. **Sign in with your Microsoft account**
4. **Your tasks should sync from OneDrive!**

## Updating Your App

After making changes to your code:

### If using GitHub Web Interface:
1. Go to your repository
2. Click the file you want to edit
3. Click the pencil icon (✏️)
4. Make your changes
5. Scroll down → "Commit changes"
6. Wait 1-2 minutes for GitHub Pages to update

### If using GitHub Desktop:
1. Make changes locally
2. Open GitHub Desktop
3. See your changes listed
4. Write a commit message
5. Click "Commit to main"
6. Click "Push origin"
7. Wait 1-2 minutes for GitHub Pages to update

### If using Git Command Line:
```bash
git add .
git commit -m "Description of changes"
git push
```

## Troubleshooting

### "404 Not Found" after enabling Pages
- Wait 2-3 minutes for GitHub to build
- Check that your `index.html` is in the root folder
- Make sure you selected the correct branch and folder

### "Sign in failed" or redirect errors
- Make sure you added the GitHub Pages URL to Azure App Registration
- Check that the URL matches exactly (including https://)
- Clear browser cache and try again

### Changes not showing up
- Wait 1-2 minutes after pushing changes
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check GitHub Actions tab to see if deployment succeeded

### Custom Domain (Optional)
If you want a custom domain:
1. Go to repository → Settings → Pages
2. Under "Custom domain", enter your domain
3. Follow DNS configuration instructions

## Security Reminder

✅ Your app is secure:
- HTTPS is automatic
- Authentication uses Microsoft OAuth
- All data stays in your OneDrive
- Code visibility doesn't affect security

## Next Steps

Once deployed:
- Bookmark your GitHub Pages URL
- Access from any device
- Make updates easily through GitHub
- Share with colleagues if desired (they'll need their own Microsoft account to sign in)

