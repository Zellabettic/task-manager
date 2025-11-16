// Main application initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI
    initializeUI();

    // Check sign-in status first
    const signedIn = isSignedIn();
    
    if (!signedIn) {
        // User is signed out - clear all tasks and localStorage
        if (typeof tasks !== 'undefined') {
            tasks = [];
        }
        localStorage.removeItem('tasks');
        
        // Show sign-in page, hide main content and header controls
        showSignInPage();
    } else {
        // User is signed in - show main content and load tasks
        showMainContent();
        try {
            const data = await syncWithOneDrive();
            if (data) {
                loadTasks(data);
                renderBuckets();
            } else {
                // Fallback to localStorage if sync fails
                const localData = getLocalTasks();
                if (localData) {
                    loadTasks(localData);
                    renderBuckets();
                }
            }
        } catch (error) {
            console.error('Auto-sync on load failed:', error);
            // Fallback to localStorage if sync fails
            const localData = getLocalTasks();
            if (localData) {
                loadTasks(localData);
                renderBuckets();
            }
        }
    }

    // Sign in button (header)
    document.getElementById('loginBtn').addEventListener('click', handleSignIn);
    
    // Sign in button (sign-in page)
    const signInPageBtn = document.getElementById('signInPageBtn');
    if (signInPageBtn) {
        signInPageBtn.addEventListener('click', handleSignIn);
    }
    
    // Handle sign in
    async function handleSignIn() {
        try {
            console.log('Attempting sign in...');
            console.log('Current URL:', window.location.href);
            const redirectUri = window.location.origin + (window.location.pathname !== '/' && window.location.pathname.endsWith('/') 
                ? window.location.pathname.slice(0, -1) 
                : window.location.pathname === '/' 
                ? '' 
                : window.location.pathname);
            console.log('Redirect URI will be:', redirectUri);
            await signIn();
            console.log('Sign in successful, syncing...');
            // Auto-sync after sign in
            await syncWithOneDrive();
            loadTasks(getLocalTasks());
            showMainContent();
            renderBuckets();
            console.log('Initial sync complete');
        } catch (error) {
            console.error('Sign in error:', error);
            // Error message already shown in signIn() function
        }
    }

    // Sign out button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        signOut();
    });
});
