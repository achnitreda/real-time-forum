let registerCleanupFunctions = [];

export async function loadRegisterPage(container) {
    try {
        // Cleanup previous event listeners
        cleanupRegisterListeners();

        container.innerHTML = `
        <div class="form-container">
    <form class="myfrom" id="registerForm">
        <h1>Register</h1>
        <div id="errorMessage"></div>

        <label for="firstName">First Name</label>
        <input
        class="input-auth"
        type="text"
        name="firstName"
        placeholder="Enter your first name"
        required
        /><br />

        <label for="lastName">Last Name</label>
        <input
        class="input-auth"
        type="text"
        name="lastName"
        placeholder="Enter your last name"
        required
        /><br />

        <label for="uname">Username</label>
        <input
        class="input-auth"
        type="text"
        name="uname"
        placeholder="Choose a username"
        required
        /><br />

        <label for="age">Age</label>
        <input
        class="input-auth"
        type="number"
        name="age"
        min="13"
        max="120"
        placeholder="Enter your age"
        required
        /><br />

        <label for="gender">Gender</label>
        <select class="input-auth" name="gender" required>
        <option value="">Select gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="prefer-not-say">Prefer not to say</option></select
        ><br />

        <label for="email">Email</label>
        <input
        class="inputauth"
        type="email"
        name="email"
        placeholder="Enter your email"
        required
        /><br />

        <label for="password">Password</label>
        <input
        class="input-auth"
        type="password"
        name="password"
        placeholder="Create a password"
        required
        /><br />

        <button class="input-auth" type="submit">Register</button>
    </form>
    <p>Already have an account? <a href="#" id="loginLink">Sign in →</a></p>
    </div>
        `;

        initializeRegister();

        return () => cleanupRegisterListeners();
    } catch (error) {
        console.error('Error loading register page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;

        return () => cleanupRegisterListeners();
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

            window.dispatchEvent(new CustomEvent('navigate', {
                detail: { path: '/login' }
            }));
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