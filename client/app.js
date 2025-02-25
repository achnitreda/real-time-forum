import { WebSocketService } from './services/websocket.js';

let currentCleanupFunction = null;

// Initialize WebSocketService early
WebSocketService.init();

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user/status');
        const data = await response.json();

         // If authenticated, ensure WebSocket is connected
         if (data.isLoggedIn) {
            WebSocketService.connect().catch(error => {
                console.error("Error connecting WebSocket:", error);
            });
        }

        return data.isLoggedIn;
    } catch (error) {
        console.error('Error checking auth status:', error);
        return false;
    }
}

async function navigateToPage(path) {
    window.history.pushState({}, '', path);
    await router();
}

async function cleanupCurrentPage() {
    if (currentCleanupFunction) {
        try {
            await currentCleanupFunction();
        } catch (error) {
            console.error('Error during cleanup:', error);
        } finally {
            currentCleanupFunction = null;
        }
    }
}

async function handlePageLoad(app, loadPage, shouldShowHeader = true) {
    try {
        // Clean up previous page, normal navigation
        await cleanupCurrentPage();

        // Clear previous content
        app.innerHTML = '';

        const header = document.getElementById('header');
        if (header) {
            header.innerHTML = '';
        }

        // Show header if needed
        if (shouldShowHeader) {
            const { renderHeader } = await import("./components/Header.js");
            await renderHeader();
        }

        // Load new page
        const result = await loadPage(app);

        // Store cleanup function if provided
        if (typeof result === 'function') {
            currentCleanupFunction = result;
        }

    } catch (error) {
        console.error('Error in handlePageLoad:', error);
        throw error;
    }
}

async function router() {
    const app = document.getElementById('app');
    const currentPath = window.location.pathname;

    try {
        const isAuthenticated = await checkAuthStatus();
        const authRoutes = ['/login', '/register'];

        // Handle auth redirects
        if (isAuthenticated && authRoutes.includes(currentPath)) {
            await navigateToPage('/');
            return;
        }

        if (!isAuthenticated && !authRoutes.includes(currentPath)) {
            await navigateToPage('/login');
            return;
        }

        switch (currentPath) {
            case '/':
            case '/home':
                const { loadHomePage } = await import("./pages/Home.js");
                await handlePageLoad(app, loadHomePage, true);
                break;
            case '/login':
                const { loadLoginPage } = await import("./pages/Login.js");
                await handlePageLoad(app, loadLoginPage, false);
                break;
            case '/register':
                const { loadRegisterPage } = await import("./pages/Register.js");
                await handlePageLoad(app, loadRegisterPage, false);
                break;
            case '/posting':
                const { loadPostingPage } = await import("./pages/Posting.js");
                await handlePageLoad(app, loadPostingPage, true);
                break;
            case '/comment':
                const { loadCommentPage } = await import("./pages/Comment.js");
                await handlePageLoad(app, loadCommentPage, true);
                break;
            case '/messages':
                const { loadMessagesPage } = await import("./pages/Messages.js");
                await handlePageLoad(app, loadMessagesPage, true);
                break;
            default:
                const { loadErrorPage } = await import("./pages/Error.js");
                await handlePageLoad(
                    app,
                    (app) => loadErrorPage(app, {
                        status: '404',
                        title: 'Page Not Found',
                        message: 'The requested page could not be found.'
                    }),
                    true
                );
        }
    } catch (error) {
        const { loadErrorPage } = await import("./pages/Error.js");
        console.error('Router error:', error);
        await handlePageLoad(
            app,
            (app) => loadErrorPage(app, {
                status: '500',
                title: 'Internal Error',
                message: 'Something went wrong. Please try again later.'
            }),
            true
        );
    }
}

// Also clean up when the window is about to unload, browser/tab closure
window.addEventListener('beforeunload', () => {
    cleanupCurrentPage();
});

// Event Listeners
const eventListeners = {
    init() {
        // Handle initial page load
        document.addEventListener('DOMContentLoaded', router);

        // Handle browser back/forward buttons, browser history navigation
        window.addEventListener('popstate', () => {
            cleanupCurrentPage().then(() => router());
        });

        // Handle custom navigation events
        window.addEventListener('navigate', (e) => {
            const { path } = e.detail;
            navigateToPage(path);
        });

        // Handle link clicks
        document.addEventListener('click', this.handleLinkClick);
    },

    handleLinkClick(e) {
        const link = e.target.closest('a');
        if (link && link.href.startsWith(window.location.origin)) {
            e.preventDefault();
            const newPath = new URL(link.href).pathname;
            navigateToPage(newPath);
        }
    }
};

// Initialize the application
eventListeners.init();