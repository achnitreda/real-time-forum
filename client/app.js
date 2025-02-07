import { loadCommentPage } from "./pages/comment/index.js";
import { loadHomePage } from "./pages/home/index.js";
import { loadLoginPage } from "./pages/login/index.js";
import { loadRegisterPage } from "./pages/register/index.js";
import { loadErrorPage } from "./pages/error/index.js";

async function router() {
    const app = document.getElementById('app');
    const path = window.location.pathname;

    try {
        switch (path) {
            case '/':
            case '/home':
                await loadHomePage(app);
                break;
            case '/login':
                await loadLoginPage(app);
                break;
            case '/register':
                await loadRegisterPage(app);
                break;
            case '/comment':
                await loadCommentPage(app);
                break;
            default:
                await loadErrorPage(app, {
                    status: '404',
                    title: 'Page Not Found',
                    message: 'The requested page could not be found.'
                });
        }
    } catch (error) {
        console.error('Router error:', error);
        await loadErrorPage(app, {
            status: '500',
            title: 'Internal Error',
            message: 'Something went wrong. Please try again later.'
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    router();
})