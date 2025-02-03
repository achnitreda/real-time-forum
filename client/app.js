async function router() {
    const app = document.getElementById('app');
    const path = window.location.pathname;

    switch (path) {
        case '/':
        case '/home':
            app.innerHTML = `
                <div>
                    <h1>home</h1>
                </div>
            `;
            break;
        case '/login':
            await loadLoginPage(app);
            break;
        case '/register':
            app.innerHTML = `
                <div>
                    <h1>register</h1>
                </div>
            `;
            break;
        default:
            app.innerHTML = `
                <div class="error-page">
                    <h1>error page</h1>
                </div>
            `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    router();
})