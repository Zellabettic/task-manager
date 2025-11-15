# Task Manager - OneDrive Sync

A full-featured web-based task manager that syncs your tasks across devices using Microsoft OneDrive.

## Features

- ✅ Create, edit, and delete tasks
- 📅 Due dates with visual indicators
- 🏷️ Priority levels (High, Medium, Low)
- 📊 Status tracking (Todo, In Progress, Done)
- 📁 Project organization
- 🏷️ Tags for categorization
- 🔄 Automatic sync with OneDrive
- 🔍 Search and filter tasks
- 📱 Responsive design for mobile and desktop
- 🔁 Recurring tasks support

## Setup Instructions

### 1. Azure App Registration

To enable OneDrive sync, you need to register the app in Azure Portal:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: Task Manager (or any name you prefer)
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: 
     - Type: **Single-page application (SPA)**
     - URI: `http://localhost:8000` (for local development) or your production URL
5. Click **Register**
6. Copy the **Application (client) ID**
7. Go to **Authentication** and ensure:
   - **Implicit grant and hybrid flows** is enabled
   - **Access tokens** is checked
8. Go to **API permissions**:
   - Click **Add a permission**
   - Select **Microsoft Graph**
   - Select **Delegated permissions**
   - Add: `Files.ReadWrite` and `User.Read`
   - Click **Add permissions**

### 2. Configure the App

1. Open `auth.js`
2. Replace `YOUR_CLIENT_ID_HERE` with your Azure Application (client) ID:

```javascript
const msalConfig = {
    auth: {
        clientId: 'YOUR_ACTUAL_CLIENT_ID_HERE',
        // ...
    }
};
```

### 3. Run the App

**Important:** You cannot just double-click `index.html` to open it. The app must be served through an HTTP server (not `file://`) because the Microsoft Graph API requires it.

Choose one of the following methods:

#### Option 1: Python HTTP Server (Easiest if Python is installed)

1. **Open a terminal/command prompt:**
   - **Windows:** Press `Win + R`, type `cmd`, press Enter
   - **Mac/Linux:** Open Terminal

2. **Navigate to the project folder:**
   ```bash
   cd "C:\Users\CleteAlbitz\OneDrive - Albitz Miloe & Associates, Inc\Task Manager"
   ```
   (Or navigate to wherever you saved the files)

3. **Start the server:**
   ```bash
   # For Python 3 (most common)
   python -m http.server 8000
   
   # OR if that doesn't work, try:
   python3 -m http.server 8000
   
   # For Python 2 (older systems)
   python -m SimpleHTTPServer 8000
   ```

4. **You should see:**
   ```
   Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
   ```

5. **Keep this terminal window open** - closing it will stop the server

6. **Open your browser** and go to: `http://localhost:8000`

#### Option 2: Node.js HTTP Server

1. **Open a terminal/command prompt**

2. **Navigate to the project folder** (same as above)

3. **Start the server:**
   ```bash
   npx http-server -p 8000
   ```
   (This will automatically download and run http-server if needed)

4. **You should see:**
   ```
   Starting up http-server, serving ./
   Available on:
     http://localhost:8000
   ```

5. **Keep this terminal window open**

6. **Open your browser** and go to: `http://localhost:8000`

#### Option 3: VS Code Live Server (Best for development)

1. **Install VS Code** if you don't have it: [Download VS Code](https://code.visualstudio.com/)

2. **Open the project folder in VS Code:**
   - File → Open Folder → Select your "Task Manager" folder

3. **Install the Live Server extension:**
   - Click the Extensions icon (or press `Ctrl+Shift+X`)
   - Search for "Live Server"
   - Install the extension by Ritwick Dey

4. **Start the server:**
   - Right-click on `index.html` in the file explorer
   - Select "Open with Live Server"
   - OR click the "Go Live" button in the bottom-right corner of VS Code

5. **Your browser will automatically open** to the app (usually `http://127.0.0.1:5500`)

### 4. Access the App

Once the server is running:

1. **Open your web browser** (Chrome, Edge, or Firefox recommended)
2. **Navigate to:**
   - `http://localhost:8000` (for Python/Node.js servers)
   - `http://127.0.0.1:5500` (for VS Code Live Server)
3. **You should see the Task Manager interface**

**Note:** If you see a blank page or errors, check:
- The server is still running (terminal/VS Code)
- You're using the correct URL (check what port the server is using)
- Open the browser's Developer Console (F12) to see any error messages

### 5. Sign In

1. Click **Sign In** button
2. Sign in with your Microsoft account
3. Grant permissions for OneDrive access
4. Your tasks will automatically sync to OneDrive as `tasks.json`

## Usage

### Creating Tasks

1. Click **Add Task** button
2. Fill in task details:
   - Title (required)
   - Description
   - Due date
   - Priority
   - Status
   - Project
   - Tags (comma-separated)
   - Recurring options (optional)
3. Click **Save Task**

### Syncing

- Tasks automatically sync to OneDrive 2 seconds after any change
- Click **Sync** button to manually sync
- Tasks are stored in `tasks.json` in your OneDrive root folder

### Filtering and Searching

- Use the search bar to find tasks by title, description, tags, or project
- Filter by status, priority, or project
- Sort by due date, priority, creation date, or title

## Data Storage

Tasks are stored in a JSON file on OneDrive with the following structure:

```json
{
  "version": "1.0",
  "lastSync": "2024-01-01T00:00:00.000Z",
  "tasks": [
    {
      "id": "unique-id",
      "title": "Task title",
      "description": "Task description",
      "dueDate": "2024-01-15",
      "priority": "high|medium|low",
      "status": "todo|in-progress|done",
      "project": "Project name",
      "tags": ["tag1", "tag2"],
      "recurring": {
        "enabled": false
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Modern browsers with ES6+ support

## Troubleshooting

### Sign In Issues

- Ensure your Azure app registration has the correct redirect URI
- Check that `Files.ReadWrite` and `User.Read` permissions are granted
- Clear browser cache and try again

### Sync Issues

- Check your internet connection
- Verify you're signed in (check the header)
- Try manual sync using the Sync button
- Check browser console for error messages

### Data Not Appearing

- Ensure you've signed in with the same Microsoft account on both computers
- Check that `tasks.json` exists in your OneDrive root folder
- Try manual sync

## Security Notes

- Authentication tokens are stored in session storage (cleared when browser closes)
- All data is stored in your personal OneDrive
- No data is sent to third-party servers
- HTTPS is recommended for production use

## Production Deployment

For production deployment:

1. Update redirect URI in Azure Portal to your production URL
2. Update `auth.js` redirect URI to match
3. Deploy files to a web server with HTTPS
4. Ensure CORS is properly configured if needed

## License

This is a personal project. Feel free to modify and use as needed.

