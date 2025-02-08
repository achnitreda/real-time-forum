import { loadCommentPage } from "./pages/comment/index.js";
import { loadHomePage } from "./pages/home/index.js";
import { loadLoginPage } from "./pages/login/index.js";
import { loadRegisterPage } from "./pages/register/index.js";
import { loadErrorPage } from "./pages/error/index.js";
import { renderHeader } from "./components/header.js";
import { loadPostingPage } from "./pages/posting/index.js";

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user/status');
        const data = await response.json();
        return data.isLoggedIn;
    } catch (error) {
        console.error('Error checking auth status:', error);
        return false;
    }
}

async function navigateToPage(path) {
    window.history.pushState({}, '', path);
    console.log(42, window.history, path)
    await router();
}

async function handlePageLoad(app, loadPage, shouldShowHeader = true) {
    const header = document.getElementById('header');
    if (header) {
        header.innerHTML = '';
    }

    if (shouldShowHeader) {
        await renderHeader();
    }

    await loadPage(app);
}

async function router() {
    const app = document.getElementById('app');
    const currentPath = window.location.pathname;

    const previousPath = sessionStorage.getItem('currentPath')
    if (previousPath && previousPath !== currentPath) {
        sessionStorage.setItem('previousPath', previousPath);
    }
    sessionStorage.setItem('currentPath', currentPath);

    try {
        const isAuthenticated = await checkAuthStatus();
        const protectedRoutes = ['/', '/home', '/posting', '/comment'];
        const authRoutes = ['/login', '/register'];

        // Handle auth redirects
        if (isAuthenticated && authRoutes.includes(currentPath)) {
            await navigateToPage('/');
            return;
        }

        if (!isAuthenticated && protectedRoutes.includes(currentPath)) {
            await navigateToPage('/login');
            return;
        }

        // Regular routing with header control
        switch (currentPath) {
            case '/':
            case '/home':
                await handlePageLoad(app, loadHomePage, true);
                break;
            case '/login':
                await handlePageLoad(app, loadLoginPage, false);
                break;
            case '/register':
                await handlePageLoad(app, loadRegisterPage, false);
                break;
            case '/posting':
                await handlePageLoad(app, loadPostingPage, true);
                break;
            case '/comment':
                await handlePageLoad(app, loadCommentPage, true);
                break;
            default:
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

// Handle initial page load
document.addEventListener('DOMContentLoaded', () => {
    router();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    router();
});

window.addEventListener('navigate', (e) => {
    const { path } = e.detail
    navigateToPage(path)
})

// Handle link clicks
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href.startsWith(window.location.origin)) {
        e.preventDefault();
        const newPath = new URL(link.href).pathname;
        navigateToPage(newPath);
    }
});