# Fix: Multi-Tenant App Configuration

## The Problem
Your Azure app is configured as **single-tenant**, but the code uses `/common` endpoint which requires **multi-tenant** configuration.

## The Solution

You need to configure your Azure app as multi-tenant to use it on both home and work computers.

### Step-by-Step Instructions:

1. **Go to Azure Portal**
   - Open [https://portal.azure.com](https://portal.azure.com)
   - Sign in with your Microsoft account

2. **Navigate to Your App**
   - Click on **Azure Active Directory** (or search for it)
   - Click **App registrations** in the left menu
   - Find and click on **Task Manager** (or search for Client ID: `621b9477-63ea-4607-b429-8bea6d11c3ab`)

3. **Change Account Type to Multi-Tenant**
   - Click on **Authentication** in the left menu
   - Under **Supported account types**, you'll see it's currently set to single-tenant
   - Click the radio button for:
     **"Accounts in any organizational directory and personal Microsoft accounts"**
     (This is the multi-tenant option)
   - Click **Save** at the top

4. **Verify Redirect URI**
   - Still in the **Authentication** section
   - Under **Single-page application** redirect URIs, make sure you have:
     - `http://localhost:8000` (or whatever port you're using)
     - `http://127.0.0.1:5500` (if using VS Code Live Server)
   - If missing, click **Add URI** and add them
   - Click **Save**

5. **Test Again**
   - Refresh your browser page (hard refresh: Ctrl+Shift+R)
   - Try signing in again

## Why This is Needed

- **Single-tenant**: Only works with accounts from ONE organization
- **Multi-tenant**: Works with accounts from ANY organization + personal Microsoft accounts

Since you want to use this on both home and work computers (which might be different organizations), you need multi-tenant configuration.

## Alternative: Use Tenant-Specific Endpoint

If you only want to use it with ONE specific organization, you can:
1. Keep the app as single-tenant
2. Change `auth.js` line 13 to use your specific tenant ID:
   ```javascript
   authority: 'https://login.microsoftonline.com/YOUR-TENANT-ID-HERE',
   ```
   (You can find your tenant ID in Azure Portal → Azure Active Directory → Overview)

But multi-tenant is recommended for your use case (home + work).

