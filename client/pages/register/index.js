import { styleManager } from "../../api/style-manager.js";

let registerCleanupFunctions = [];

export async function loadRegisterPage(container) {
    try {
        // Cleanup previous event listeners
        cleanupRegisterListeners();

        const htmlResponse = await fetch('/client/pages/register/register.html');
        const html = await htmlResponse.text();

        await styleManager.loadStyles(
            'register',
            '/client/pages/register/register.css'
        );

        container.innerHTML = html;
        initializeRegister();
    } catch (error) {
        console.error('Error loading register page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

function cleanupRegisterListeners() {
    registerCleanupFunctions.forEach(cleanup => cleanup());
    registerCleanupFunctions = [];
}

function initializeRegister() {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginLink = document.getElementById('loginLink');

    const loginLinkHandler = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        const navigationEvent = new CustomEvent('navigate', {
            detail: { path: '/login' }
        });
        window.dispatchEvent(navigationEvent);
    };

    const formSubmitHandler = async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';

        try {
            const formData = new FormData(registerForm);
            const userData = {
                email: formData.get('email'),
                username: formData.get('uname'),
                password: formData.get('password'),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                age: parseInt(formData.get('age')),
                gender: formData.get('gender')
            };

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            const navigationEvent = new CustomEvent('navigate', {
                detail: { path: '/login' }
            });
            window.dispatchEvent(navigationEvent);
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    };

    loginLink.addEventListener('click', loginLinkHandler);
    registerForm.addEventListener('submit', formSubmitHandler);

    // Store cleanup functions
    registerCleanupFunctions.push(
        () => loginLink.removeEventListener('click', loginLinkHandler),
        () => registerForm.removeEventListener('submit', formSubmitHandler)
    );
}