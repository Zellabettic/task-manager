# Task Manager

A full-featured web-based task manager that syncs your tasks across devices using Microsoft OneDrive.

## Features

- 📅 Bucket-based organization (This Week, Next Week, This Month, etc.)
- 🚩 Flagged tasks for priority items
- ✅ Task completion tracking
- 🔄 Automatic OneDrive sync
- 📱 Works on any device with a browser
- ⌨️ Keyboard shortcuts (press 'q' to add task)
- 🎯 Natural language date input

## Live Demo

Access the app at: [Your GitHub Pages URL]

## Setup

1. Clone this repository
2. Configure Azure App Registration (see below)
3. Update `auth.js` with your Client ID
4. Deploy to GitHub Pages (see GITHUB-DEPLOYMENT.md)

## Azure Configuration

This app requires an Azure App Registration for Microsoft authentication:

1. Go to [Azure Portal](https://portal.azure.com)
2. Create an App Registration
3. Add redirect URI: `https://YOUR_USERNAME.github.io/task-manager`
4. Add permissions: `Files.ReadWrite` and `User.Read`
5. Copy Client ID to `auth.js`

## Local Development

To run locally:

```bash
python3 -m http.server 8000
```

Then open: http://localhost:8000

## License

Personal project - use as needed.

