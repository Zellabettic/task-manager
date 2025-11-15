# Quick Start Guide

## Fastest Way to Get Started

### Step 1: Configure Azure (One-time setup)

1. Go to [Azure Portal](https://portal.azure.com)
2. Azure Active Directory → App registrations → New registration
3. Name: "Task Manager"
4. Supported accounts: "Accounts in any organizational directory and personal Microsoft accounts"
5. Redirect URI: Single-page application → `http://localhost:8000`
6. Click Register
7. Copy the **Application (client) ID**
8. Open `auth.js` and replace `YOUR_CLIENT_ID_HERE` with your Client ID
9. Go to API permissions → Add permission → Microsoft Graph → Delegated permissions
10. Add: `Files.ReadWrite` and `User.Read`
11. Click "Add permissions"

### Step 2: Start the Server

**Windows Users - Easiest Method:**
1. Double-click `start-server.bat`
2. A window will open - keep it open
3. Open your browser to `http://localhost:8000`

**If that doesn't work, use one of these:**

**Option A: Python (if installed)**
1. Open Command Prompt (Win+R, type `cmd`)
2. Navigate to this folder:
   ```
   cd "C:\Users\CleteAlbitz\OneDrive - Albitz Miloe & Associates, Inc\Task Manager"
   ```
3. Type: `python -m http.server 8000`
4. Press Enter
5. Open browser to `http://localhost:8000`

**Option B: VS Code (Recommended)**
1. Install [VS Code](https://code.visualstudio.com/)
2. Open this folder in VS Code
3. Install "Live Server" extension
4. Right-click `index.html` → "Open with Live Server"
5. Browser opens automatically

### Step 3: Use the App

1. Click "Sign In" button
2. Sign in with your Microsoft account
3. Grant permissions when asked
4. Start adding tasks!

## Troubleshooting

**"Server won't start"**
- Make sure Python or Node.js is installed
- Check that you're in the correct folder
- Try a different port: `python -m http.server 8080` (then use `http://localhost:8080`)

**"Can't sign in"**
- Make sure you completed Step 1 (Azure setup)
- Check that the Client ID in `auth.js` is correct
- Make sure redirect URI in Azure matches `http://localhost:8000`

**"Tasks not syncing"**
- Make sure you're signed in (check top-right corner)
- Click the "Sync" button manually
- Check browser console (F12) for errors

## Need More Help?

See the full README.md for detailed instructions.

