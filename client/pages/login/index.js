import { styleManager } from "../../api/style-manager.js";

let loginCleanupFunctions = []

export async function loadLoginPage(container) {
    try {
        // 0 Cleanup previous event listeners
        cleanupLoginListeners();

        // 1. Load HTML & CSS
        const htmlResponse = await fetch('/client/pages/login/login.html');
        const html = await htmlResponse.text();

        // Load styles using style manager
        await styleManager.loadStyles(
            'login',
            '/client/pages/login/login.css'
        );

        container.innerHTML = html;

        // 2. Initialize login form
        initializeLoginForm();

    } catch (error) {
        console.error('Error loading login page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

function cleanupLoginListeners() {
    loginCleanupFunctions.forEach(cleanup => cleanup());
    loginCleanupFunctions = [];
}

function initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const registerLink = document.getElementById('registerLink');

    const formSubmitHandler = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData(loginForm);
            const response = await fetch('/api/login', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Login failed');
            }

            const navigationEvent = new CustomEvent('navigate', {
                detail: { path: '/' }
            });
            window.dispatchEvent(navigationEvent);
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.color = 'red';
        }
    };

    const registerLinkHandler = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        const navigationEvent = new CustomEvent('navigate', {
            detail: { path: '/register' }
        });
        window.dispatchEvent(navigationEvent);
    };

    loginForm.addEventListener('submit', formSubmitHandler);
    registerLink.addEventListener('click', registerLinkHandler);

    // Store cleanup functions
    loginCleanupFunctions.push(
        () => loginForm.removeEventListener('submit', formSubmitHandler),
        () => registerLink.removeEventListener('click', registerLinkHandler)
    );
}
