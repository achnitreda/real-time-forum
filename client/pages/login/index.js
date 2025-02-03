export async function loadLoginPage(container) {
    try {
        // NOTE: should it really be /client/pages/login/login.html 
        // or can I use relative path
        const response = await fetch('/client/pages/login/login.html')
        const html = await response.text()
        container.innerHTML = html

        initializeLoginForm();
    } catch (error) {
        console.error('Error loading login page:', error);
    }
}

function initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const formData = new FormData(loginForm);
    })
}