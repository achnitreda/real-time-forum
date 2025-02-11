let loginCleanupFunctions = [];

export async function loadLoginPage(container) {
    try {
        // Cleanup previous event listeners
        cleanupLoginListeners();

        // Insert HTML structure directly
        container.innerHTML = `
            <div class="form-container">
                <form class="myfrom" id="loginForm">
                    <h1>login</h1>
                    <div id="errorMessage"></div>
                    <label for="email">Email or Username</label>
                    <input
                        class="input-auth"
                        type="text"
                        name="email"
                        placeholder="Enter your email or username"
                        required
                    /><br />
                    <label for="password">Password</label>
                    <input
                        class="input-auth"
                        type="password"
                        name="password"
                        placeholder="Enter your password"
                        required
                    /><br />
                    <button class="input-auth" type="submit">Login</button>
                </form>
                <p>New to forumApp? <a href="#" id="registerLink">Create an account</a></p>
            </div>
        `;

        // Initialize login form
        initializeLoginForm();

        return () => cleanupLoginListeners();

    } catch (error) {
        console.error('Error loading login page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;

        return () => cleanupLoginListeners()
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
        errorMessage.textContent = ''; // Clear previous error

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

            window.dispatchEvent(new CustomEvent('navigate', {
                detail: { path: '/' }
            }));
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.color = 'red';
        }
    };

    const registerLinkHandler = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling

        window.dispatchEvent(new CustomEvent('navigate', {
            detail: { path: '/register' }
        }));
    };

    loginForm.addEventListener('submit', formSubmitHandler);
    registerLink.addEventListener('click', registerLinkHandler);

    // Store cleanup functions
    loginCleanupFunctions.push(
        () => loginForm.removeEventListener('submit', formSubmitHandler),
        () => registerLink.removeEventListener('click', registerLinkHandler)
    );
}