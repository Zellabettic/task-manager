# Troubleshooting Guide

## Sign-In Issues

### Common Error Messages and Solutions

#### "Sign in failed. Error: invalid_client" or "AADSTS700016"
**Problem:** The app is not registered in Azure or the Client ID is incorrect.

**Solution:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Find your app (or create a new one)
4. Copy the **Application (client) ID**
5. Open `auth.js` and replace the Client ID on line 12
6. Make sure the app registration exists and is active

#### "Sign in failed. Error: popup_window_error" or "popup_window_timeout"
**Problem:** Browser is blocking popups or the popup window closed too quickly.

**Solution:**
1. **Allow popups for localhost:**
   - Chrome/Edge: Click the popup blocker icon in the address bar → Always allow popups
   - Firefox: Go to Settings → Privacy & Security → Permissions → Block pop-up windows → Exceptions → Add `http://localhost`
2. **Disable popup blockers** temporarily for testing
3. **Try a different browser** (Chrome/Edge work best)

#### "Sign in failed. Error: AADSTS50011"
**Problem:** Redirect URI mismatch - the URL in Azure doesn't match where you're running the app.

**Solution:**
1. **Check what URL you're using:**
   - Open the browser console (F12)
   - Click "Sign In"
   - Look for the console message showing "Redirect URI will be: http://localhost:XXXX"
   - Note the exact port number

2. **Update Azure Portal:**
   - Go to Azure Portal → Your App → **Authentication**
   - Under **Redirect URIs**, make sure you have:
     - `http://localhost:8000` (if using Python/Node server)
     - `http://127.0.0.1:5500` (if using VS Code Live Server)
     - `http://localhost:5500` (alternative for Live Server)
   - Add ALL the ports you might use
   - Type must be **Single-page application (SPA)**
   - Click **Save**

3. **Common redirect URIs to add:**
   ```
   http://localhost:8000
   http://localhost:5500
   http://127.0.0.1:5500
   http://localhost:8080
   ```

#### "Sign in failed. Error: AADSTS65005"
**Problem:** Required permissions not granted.

**Solution:**
1. Go to Azure Portal → Your App → **API permissions**
2. Make sure you have:
   - `Files.ReadWrite` (Microsoft Graph - Delegated)
   - `User.Read` (Microsoft Graph - Delegated)
3. If permissions show "Not granted", click **Grant admin consent** (if you're an admin) or sign in and grant consent

#### "MSAL library not loaded"
**Problem:** The MSAL.js library failed to load from the CDN.

**Solution:**
1. Check your internet connection
2. Open browser console (F12) and look for network errors
3. Try refreshing the page
4. If using a firewall/proxy, allow access to `cdn.jsdelivr.net`

### Debugging Steps

1. **Open Browser Console (F12)**
   - Look for error messages when clicking "Sign In"
   - Check the Console tab for detailed errors

2. **Check Redirect URI Match:**
   - In console, you'll see: "Redirect URI will be: http://localhost:XXXX"
   - This MUST exactly match what's in Azure Portal (including the port)

3. **Verify Azure Configuration:**
   - Client ID is correct in `auth.js`
   - Redirect URI is added in Azure (Authentication section)
   - Permissions are granted (API permissions section)
   - App registration is active (not deleted)

4. **Test with Different Port:**
   - If using port 8000, try 8080 or 5500
   - Update Azure redirect URI to match
   - Update the server command: `python -m http.server 8080`

## Sync Issues

### Tasks Not Syncing Automatically

**Check:**
1. Are you signed in? (Check top-right corner for your email)
2. Open browser console (F12) - look for "Auto-sync failed" errors
3. Check your internet connection
4. Tasks sync automatically 2 seconds after you make changes

### Manual Sync (if needed)

If auto-sync isn't working, you can temporarily add back the sync button:
1. Open `index.html`
2. Find the header section
3. Add this line after the Sign In button:
   ```html
   <button id="syncBtn" class="btn btn-secondary" style="display: none;">Sync</button>
   ```
4. Open `auth.js` and change line 109 to:
   ```javascript
   document.getElementById('syncBtn').style.display = 'inline-flex';
   ```

## General Issues

### "Cannot read property of undefined"
**Problem:** Scripts loading in wrong order or missing files.

**Solution:**
1. Make sure all files are in the same folder:
   - index.html
   - auth.js
   - onedrive.js
   - task-manager.js
   - ui.js
   - app.js
   - styles.css
2. Check browser console for 404 errors (missing files)
3. Make sure you're running through a server (not file://)

### Blank Page
**Problem:** JavaScript error preventing page load.

**Solution:**
1. Open browser console (F12)
2. Look for red error messages
3. Check that all script files are loading (Network tab)
4. Verify the MSAL library loaded: `https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.0.0/dist/msal-browser.min.js`

## Still Having Issues?

1. **Check Browser Console (F12)** - Most errors will show here
2. **Try a Different Browser** - Chrome or Edge work best
3. **Verify Azure Setup** - Double-check all steps in README.md
4. **Check Network Tab** - Look for failed requests (red entries)

## Getting Help

When asking for help, provide:
- Browser and version
- Error message from console (F12)
- What URL you're using (http://localhost:XXXX)
- Screenshot of Azure Portal redirect URI settings
- Any console error messages

