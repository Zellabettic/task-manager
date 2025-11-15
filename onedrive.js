// OneDrive API operations
const ONEDRIVE_API_BASE = 'https://graph.microsoft.com/v1.0/me/drive/root';
const TASKS_FOLDER_NAME = 'Task Manager';
const TASKS_FILE_NAME = 'tasks.json';

// Ensure Task Manager folder exists in OneDrive
async function ensureTasksFolder(accessToken) {
    try {
        // Try to get the folder
        const folderPath = `:/${TASKS_FOLDER_NAME}:`;
        const folderUrl = `${ONEDRIVE_API_BASE}${folderPath}`;
        
        const response = await fetch(folderUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            // Folder exists
            return true;
        }

        if (response.status === 404) {
            // Folder doesn't exist, create it
            const createUrl = `${ONEDRIVE_API_BASE}/children`;
            const createResponse = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: TASKS_FOLDER_NAME,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'fail'
                })
            });

            if (!createResponse.ok) {
                throw new Error(`Failed to create folder: ${createResponse.statusText}`);
            }
            return true;
        }

        throw new Error(`Failed to check folder: ${response.statusText}`);
    } catch (error) {
        console.error('Error ensuring folder exists:', error);
        throw error;
    }
}

// Get file content from OneDrive
async function readTasksFile() {
    if (!isSignedIn()) {
        throw new Error('Not signed in');
    }

    try {
        const accessToken = await getAccessToken();
        await ensureTasksFolder(accessToken);
        
        const filePath = `:/${TASKS_FOLDER_NAME}/${TASKS_FILE_NAME}:`;
        const url = `${ONEDRIVE_API_BASE}${filePath}/content`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.status === 404) {
            // File doesn't exist, return empty structure
            return {
                version: '1.0',
                lastSync: new Date().toISOString(),
                tasks: []
            };
        }

        if (!response.ok) {
            throw new Error(`Failed to read file: ${response.statusText}`);
        }

        const text = await response.text();
        return JSON.parse(text);
    } catch (error) {
        console.error('Error reading tasks file:', error);
        throw error;
    }
}

// Save file content to OneDrive
async function saveTasksFile(data) {
    if (!isSignedIn()) {
        throw new Error('Not signed in');
    }

    try {
        const accessToken = await getAccessToken();
        await ensureTasksFolder(accessToken);
        
        const filePath = `:/${TASKS_FOLDER_NAME}/${TASKS_FILE_NAME}:`;
        const url = `${ONEDRIVE_API_BASE}${filePath}/content`;

        // Update lastSync timestamp
        data.lastSync = new Date().toISOString();
        const jsonContent = JSON.stringify(data, null, 2);

        // First, try to update existing file
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: jsonContent
        });

        if (response.ok) {
            // PUT to /content may return empty body or file metadata
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    return await response.json();
                } catch (e) {
                    // Empty response is OK
                    return { success: true };
                }
            }
            return { success: true };
        }

        // If file doesn't exist (404), create it
        if (response.status === 404) {
            return await createTasksFile(data, accessToken);
        }

        // Other errors
        const errorText = await response.text();
        throw new Error(`Failed to save file: ${response.status} ${errorText}`);
    } catch (error) {
        console.error('Error saving tasks file:', error);
        throw error;
    }
}

// Create new file in OneDrive
async function createTasksFile(data, accessToken = null) {
    if (!isSignedIn()) {
        throw new Error('Not signed in');
    }

    try {
        if (!accessToken) {
            accessToken = await getAccessToken();
        }

        // Ensure folder exists first
        await ensureTasksFolder(accessToken);
        
        // Create file with content using upload session for small files
        // For small files (< 4MB), we can use simple upload
        const url = `${ONEDRIVE_API_BASE}:/${TASKS_FOLDER_NAME}/${TASKS_FILE_NAME}:/content`;
        
        data.lastSync = new Date().toISOString();
        const jsonContent = JSON.stringify(data, null, 2);

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: jsonContent
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create file: ${response.status} ${errorText}`);
        }

        // PUT to /content may return empty body or file metadata
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                return await response.json();
            } catch (e) {
                // Empty response is OK
                return { success: true };
            }
        }
        return { success: true };
    } catch (error) {
        console.error('Error creating tasks file:', error);
        throw error;
    }
}

// Sync tasks with OneDrive
async function syncWithOneDrive() {
    if (!isSignedIn()) {
        alert('Please sign in first');
        return null;
    }

    showLoading(true);
    try {
        // Read from OneDrive
        const remoteData = await readTasksFile();
        
        // Get local data
        const localData = getLocalTasks();
        
        // Merge strategy: prefer remote if it's newer, otherwise merge
        let mergedData;
        if (!localData || localData.tasks.length === 0) {
            mergedData = remoteData;
        } else if (!remoteData || remoteData.tasks.length === 0) {
            mergedData = localData;
        } else {
            // Merge: combine unique tasks by ID, keep most recent version
            mergedData = mergeTaskData(localData, remoteData);
        }

        // Save merged data locally and remotely
        saveLocalTasks(mergedData);
        await saveTasksFile(mergedData);

        showLoading(false);
        return mergedData;
    } catch (error) {
        showLoading(false);
        console.error('Sync error:', error);
        alert(`Sync failed: ${error.message}`);
        throw error;
    }
}

// Merge two task datasets
function mergeTaskData(localData, remoteData) {
    const taskMap = new Map();
    
    // Add all remote tasks first
    if (remoteData.tasks) {
        remoteData.tasks.forEach(task => {
            taskMap.set(task.id, task);
        });
    }
    
    // Add/update with local tasks (keep most recently updated version)
    if (localData.tasks) {
        localData.tasks.forEach(task => {
            const existing = taskMap.get(task.id);
            if (!existing) {
                // New task, add it
                taskMap.set(task.id, task);
            } else {
                // Compare timestamps - keep the most recently updated
                const localTime = new Date(task.updatedAt || task.createdAt || 0);
                const remoteTime = new Date(existing.updatedAt || existing.createdAt || 0);
                if (localTime > remoteTime) {
                    taskMap.set(task.id, task);
                }
            }
        });
    }

    return {
        version: remoteData.version || localData.version || '1.0',
        lastSync: new Date().toISOString(),
        tasks: Array.from(taskMap.values())
    };
}

// Show/hide loading overlay
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

