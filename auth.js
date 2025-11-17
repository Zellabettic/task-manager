// Microsoft Authentication Configuration
// TODO: Replace with your Azure App Registration Client ID
// Get current URL for redirect URI
const getRedirectUri = () => {
    const origin = window.location.origin;
    let pathname = window.location.pathname;
    // Remove trailing slash unless it's the root path
    if (pathname !== '/' && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
    }
    // For GitHub Pages with repository name, pathname will be '/task-manager'
    // For localhost, pathname is usually '/'
    return origin + pathname;
};

const msalConfig = {
    auth: {
        clientId: '621b9477-63ea-4607-b429-8bea6d11c3ab', // Replace with your Azure App Client ID
        authority: 'https://login.microsoftonline.com/organizations', // For single-tenant apps (work/school accounts)
        redirectUri: getRedirectUri()
    },
    cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false
    }
};

// Scopes required for OneDrive access
const loginRequest = {
    scopes: ['Files.ReadWrite', 'User.Read']
};

// Popup window configuration
const popupConfig = {
    popupWindowAttributes: {
        width: 483,
        height: 600,
        left: window.screen.width / 2 - 241.5,
        top: window.screen.height / 2 - 300
    }
};

let currentAccount = null;
let msalInstance = null;

// Wait for MSAL library to load and create instance
function createMsalInstance() {
    if (typeof msal === 'undefined') {
        console.error('MSAL library not loaded yet');
        return null;
    }
    
    if (!msalInstance) {
        try {
            msalInstance = new msal.PublicClientApplication(msalConfig);
        } catch (error) {
            console.error('Failed to create MSAL instance:', error);
            return null;
        }
    }
    return msalInstance;
}

// Initialize MSAL
async function initializeAuth() {
    // Wait for MSAL library to be available
    if (typeof msal === 'undefined') {
        console.error('MSAL library not loaded. Check the script tag in index.html');
        alert('Error: MSAL authentication library failed to load. Please check your internet connection and refresh the page.');
        return;
    }
    
    // Create instance if not already created
    if (!msalInstance) {
        msalInstance = createMsalInstance();
        if (!msalInstance) {
            return;
        }
    }
    
    try {
        await msalInstance.initialize();
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            currentAccount = accounts[0];
            updateUIForSignedIn();
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
    }
}

// Sign in
async function signIn() {
    // Ensure MSAL instance is created
    if (!msalInstance) {
        msalInstance = createMsalInstance();
        if (!msalInstance) {
            throw new Error('MSAL library not loaded. Please refresh the page.');
        }
        await msalInstance.initialize();
    }
    
    // Clear any pending interactions
    try {
        await msalInstance.handleRedirectPromise();
    } catch (error) {
        // Ignore - no pending redirects
    }
    
    try {
        console.log('Opening sign-in popup...');
        // Use popup configuration for better control
        const response = await msalInstance.loginPopup({
            ...loginRequest,
            ...popupConfig
        });
        
        console.log('Sign-in popup response received:', response);
        
        if (response && response.account) {
            currentAccount = response.account;
            console.log('Sign-in successful for:', currentAccount.username);
            updateUIForSignedIn();
            
            // Ensure popup closes after successful authentication
            // MSAL should handle this automatically, but we ensure it happens
            try {
                // The popup window should close automatically after MSAL processes the response
                // If it doesn't, the user can close it manually
            } catch (e) {
                console.log('Popup close handled by MSAL');
            }
            
            return response;
        } else {
            console.error('Sign in completed but no account was returned');
            throw new Error('Sign in completed but no account was returned');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        console.error('Error details:', {
            errorCode: error.errorCode,
            errorMessage: error.errorMessage,
            message: error.message,
            stack: error.stack
        });
        
        // Handle interaction_in_progress specifically
        if (error.errorCode === 'interaction_in_progress') {
            alert('A sign-in window is already open. Please close it and try again, or refresh the page.');
            return null;
        }
        
        if (error.errorCode === 'user_cancelled' || error.errorCode === 'user_cancel') {
            return null;
        }
        
        // Provide more helpful error messages
        let errorMessage = 'Sign in failed. ';
        if (error.errorCode) {
            errorMessage += `Error: ${error.errorCode}. `;
        }
        if (error.errorMessage) {
            errorMessage += error.errorMessage;
        } else if (error.message) {
            errorMessage += error.message;
        }
        
        // Common issues
        if (error.errorCode === 'invalid_client' || error.errorCode === 'AADSTS700016') {
            errorMessage += '\n\nPossible causes:\n- Client ID is incorrect\n- App not registered in Azure Portal\n- Redirect URI mismatch';
        } else if (error.errorCode === 'popup_window_error' || error.errorCode === 'popup_window_timeout') {
            errorMessage += '\n\nPlease allow popups for this site and try again.';
        }
        
        alert(errorMessage);
        throw error;
    }
}

// Sign out
function signOut() {
    // Clear MSAL cache from sessionStorage (no popup)
    // Note: MSAL v3 doesn't have clearCache(), so we manually clear sessionStorage
    try {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
            if (key.startsWith('msal.') || key.includes('msal')) {
                sessionStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.log('Error clearing sessionStorage:', error);
    }
    
    currentAccount = null;
    
    // Clear tasks from memory
    if (typeof tasks !== 'undefined') {
        tasks = [];
    }
    
    // Clear localStorage directly
    localStorage.removeItem('tasks');
    
    // Also save empty tasks to ensure it's cleared
    if (typeof saveLocalTasks !== 'undefined') {
        saveLocalTasks({ version: '1.0', lastSync: new Date().toISOString(), tasks: [] });
    }
    
    // Hide completed view if it's showing
    const completedView = document.getElementById('completedView');
    if (completedView) {
        completedView.style.display = 'none';
    }
    
    // Update UI to show sign-in page
    updateUIForSignedOut();
}

// Get access token
async function getAccessToken() {
    if (!currentAccount) {
        throw new Error('Not signed in');
    }
    
    if (!msalInstance) {
        msalInstance = createMsalInstance();
        if (!msalInstance) {
            throw new Error('MSAL library not loaded');
        }
        await msalInstance.initialize();
    }

    try {
        const response = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account: currentAccount
        });
        return response.accessToken;
    } catch (error) {
        if (error.errorCode === 'interaction_required') {
            const response = await msalInstance.acquireTokenPopup(loginRequest);
            return response.accessToken;
        }
        throw error;
    }
}

// Update UI based on auth state
function updateUIForSignedIn() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (currentAccount && userInfo) {
        userInfo.textContent = `Signed in as ${currentAccount.username}`;
        userInfo.style.display = 'inline-block';
    }
    
    // Show main content, hide sign-in page
    if (typeof showMainContent === 'function') {
        showMainContent();
    }
}

function updateUIForSignedOut() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (userInfo) {
        userInfo.textContent = '';
        userInfo.style.display = 'none'; // Hide user info
    }
    
    // Show sign-in page, hide main content
    if (typeof showSignInPage === 'function') {
        showSignInPage();
    }
}

// Check if user is signed in
function isSignedIn() {
    return currentAccount !== null;
}

// Wait for MSAL library to load, then initialize
function waitForMsalAndInit() {
    if (typeof msal !== 'undefined' && msal.PublicClientApplication) {
        initializeAuth();
    } else {
        // Check every 100ms until MSAL is loaded (max 5 seconds)
        let attempts = 0;
        const maxAttempts = 50;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof msal !== 'undefined' && msal.PublicClientApplication) {
                clearInterval(checkInterval);
                initializeAuth();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('MSAL library failed to load after 5 seconds');
                alert('MSAL authentication library failed to load. Please check your internet connection and refresh the page.');
            }
        }, 100);
    }
}

// Initialize on load - wait for DOM and MSAL library
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForMsalAndInit);
} else {
    // DOM already loaded
    waitForMsalAndInit();
}

