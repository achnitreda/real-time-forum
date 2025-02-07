export async function loadLoginPage(container) {
    try {
        // 1. Load HTML & CSS
        const htmlResponse = await fetch('/client/pages/login/login.html');
        const html = await htmlResponse.text();

        const cssResponse = await fetch('/client/pages/login/login.css');
        const css = await cssResponse.text();

        const styleSheet = document.createElement('style');
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);

        container.innerHTML = html;

        // 2. Initialize login form
        initializeLoginForm();

    } catch (error) {
        console.error('Error loading login page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

function initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const registerLink = document.getElementById('registerLink');

    loginForm.addEventListener('submit', async (e) => {
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

            // Redirect to home page on successful login
            window.location.href = '/';

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.color = 'red';
        }
    });

    // Handle register link click
    registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/register';
    });
}