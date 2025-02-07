export async function loadRegisterPage(container) {
    try {
        // Load HTML & CSS
        const htmlResponse = await fetch('/client/pages/register/register.html');
        const html = await htmlResponse.text();
        const cssResponse = await fetch('/client/pages/register/register.css');
        const css = await cssResponse.text();

        // Add CSS to head
        const styleSheet = document.createElement('style');
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);

        // Set HTML content
        container.innerHTML = html;

        // Initialize register page functionality
        initializeRegister();
    } catch (error) {
        console.error('Error loading register page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

function initializeRegister() {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginLink = document.getElementById('loginLink');

    // Handle login link click
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/login';
    });

    // Handle form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';

        try {
            const formData = new FormData(registerForm);
            const userData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                username: formData.get('uname'),
                age: parseInt(formData.get('age')),
                gender: formData.get('gender'),
                email: formData.get('email'),
                password: formData.get('password')
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

            // Registration successful
            window.location.href = '/login';
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
}