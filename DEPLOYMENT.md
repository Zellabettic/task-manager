# Azure Static Web Apps Deployment Guide

## Prerequisites

1. An Azure account (you have Microsoft E3, so you're all set!)
2. Your Task Manager files ready to deploy
3. Your Azure App Registration Client ID (already in `auth.js`)

## Step 1: Create Azure Static Web App

1. **Go to Azure Portal**: https://portal.azure.com
2. **Click "Create a resource"** (or use the search bar)
3. **Search for "Static Web Apps"** and select it
4. **Click "Create"**

## Step 2: Configure Basic Settings

Fill in the form:

- **Subscription**: Select your subscription
- **Resource Group**: 
  - Create new: "task-manager-rg" (or use existing)
- **Name**: "task-manager" (or your preferred name)
  - This will be part of your URL: `https://task-manager.azurestaticapps.net`
- **Plan type**: **Free** (select Free tier)
- **Region**: Choose closest to you (e.g., "East US", "West Europe")
- **Deployment details**: 
  - Select **"Other"** (we'll deploy manually)
  - Or choose **"GitHub"** if you want automatic deployments

Click **"Review + create"**, then **"Create"**

## Step 3: Get Your Deployment URL

After creation (takes ~1 minute):

1. Go to your Static Web App resource
2. Click **"Overview"**
3. Note your **URL**: `https://your-app-name.azurestaticapps.net`
4. Click **"Manage deployment token"** and copy the token (you'll need this)

## Step 4: Update Azure App Registration

**IMPORTANT**: You must add your new URL to allowed redirect URIs:

1. Go to **Azure Portal** → **Azure Active Directory** → **App registrations**
2. Find your app (or the one with Client ID: `621b9477-63ea-4607-b429-8bea6d11c3ab`)
3. Click **"Authentication"**
4. Under **"Single-page application"** → **"Redirect URIs"**
5. Click **"Add URI"** and add:
   - `https://your-app-name.azurestaticapps.net`
   - `https://your-app-name.azurestaticapps.net/` (with trailing slash)
6. Click **"Save"**

## Step 5: Deploy Your Files

### Option A: Azure Portal (Easiest - Manual Upload)

1. Go to your Static Web App → **"Overview"**
2. Click **"Browse"** (opens your site)
3. Or go to **"Deployment Center"** → **"Other"** tab
4. You'll see deployment instructions

**Using Azure CLI** (recommended for manual deployment):

1. **Install Azure CLI** if not installed: https://aka.ms/installazurecliwindows
2. **Login to Azure**:
   ```bash
   az login
   ```
3. **Navigate to your project folder**:
   ```bash
   cd "C:\Users\CleteAlbitz\OneDrive - Albitz Miloe & Associates, Inc\Task Manager"
   ```
4. **Deploy using the deployment token**:
   ```bash
   az staticwebapp deploy --name your-app-name --resource-group task-manager-rg --source-location . --deployment-token YOUR_DEPLOYMENT_TOKEN
   ```

### Option B: VS Code Extension (Recommended)

1. **Install VS Code** if not already installed
2. **Install "Azure Static Web Apps" extension** in VS Code
3. **Open your project folder** in VS Code
4. **Right-click on your project folder** → **"Deploy to Static Web App"**
5. **Select your subscription** and **Static Web App**
6. **Choose deployment location**: Select the root folder (`.`)
7. Files will deploy automatically!

### Option C: GitHub Integration (Best for Automatic Updates)

1. **Create a GitHub repository** (if you don't have one)
2. **Push your code** to GitHub
3. In Azure Portal → Your Static Web App → **"Deployment Center"**
4. Choose **"GitHub"** → Authorize → Select your repo
5. **Configure**:
   - Branch: `main` or `master`
   - Build location: `/` (root)
   - App artifact location: `/` (root)
6. Click **"Save"**
7. Every time you push to GitHub, Azure will automatically deploy!

## Step 6: Verify Deployment

1. Go to your Static Web App URL: `https://your-app-name.azurestaticapps.net`
2. Click **"Sign In"**
3. Sign in with your Microsoft account
4. Your tasks should sync from OneDrive!

## Files to Deploy

Make sure these files are included:
- ✅ `index.html`
- ✅ `app.js`
- ✅ `auth.js`
- ✅ `onedrive.js`
- ✅ `task-manager.js`
- ✅ `ui.js`
- ✅ `styles.css`
- ✅ `staticwebapp.config.json` (created for you)

**Do NOT deploy**:
- ❌ `start-server.bat` (Windows only)
- ❌ `start-server.ps1` (Windows only)
- ❌ `tasks.json` (this is local data, OneDrive will sync)
- ❌ `README.md`, `DEPLOYMENT.md`, etc. (optional, won't hurt)

## Updating Your App

After making changes:

### If using Manual/CLI deployment:
1. Make your changes locally
2. Test locally: `python3 -m http.server 8000`
3. Deploy again using the same method (CLI or VS Code)

### If using GitHub:
1. Make your changes locally
2. Commit and push to GitHub
3. Azure automatically deploys (takes 1-2 minutes)

## Troubleshooting

### "Sign in failed" or redirect errors
- Make sure you added the Static Web App URL to Azure App Registration redirect URIs
- Check that the URL matches exactly (including https://)

### Files not updating
- Clear browser cache (Ctrl+Shift+Delete)
- Wait 1-2 minutes for deployment to complete
- Check deployment status in Azure Portal → Deployment Center

### CORS errors
- Azure Static Web Apps handles CORS automatically
- If you see errors, check browser console for specific issues

## Security Notes

✅ Your app will be served over HTTPS automatically
✅ Authentication uses Microsoft OAuth (secure)
✅ All data stays in your OneDrive (not on Azure)
✅ Free tier is perfect for personal use

## Next Steps

Once deployed, you can:
- Access from any device with a browser
- Share the URL with colleagues (if you want)
- Make updates easily using your preferred deployment method
- Set up custom domain (optional, in Azure Portal → Custom domains)

