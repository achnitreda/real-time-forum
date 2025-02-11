let errorCleanupFunctions = [];

export async function loadErrorPage(container, errorData) {
    try {
        cleanupErrorListeners();

        container.innerHTML = `
            <div class="err">
                <div class="error-content">
                    <div class="error-status">
                        <span id="errstatus"></span>
                    </div>
                    <div class="error-details">
                        <h1 id="errtitle"></h1>
                        <p id="errmessage"></p>
                        <a href="#" id="goBackLink" class="back-link">Go Back</a>
                    </div>
                </div>
            </div>
        `;

        initializeErrorPage(errorData);

        return () => cleanupErrorListeners();

    } catch (error) {
        console.error('Error loading error page:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h1>Error</h1>
                <p>Something went wrong. Please try again later.</p>
            </div>
        `;
        return () => cleanupErrorListeners();
    }
}

function cleanupErrorListeners() {
    errorCleanupFunctions.forEach(cleanup => cleanup());
    errorCleanupFunctions = [];
}

function initializeErrorPage(errorData = {}) {
    const statusElement = document.getElementById('errstatus');
    const titleElement = document.getElementById('errtitle');
    const messageElement = document.getElementById('errmessage');
    const goBackLink = document.getElementById('goBackLink');

    if (statusElement) statusElement.textContent = errorData.status || '404';
    if (titleElement) titleElement.textContent = errorData.title || 'Page Not Found';
    if (messageElement) messageElement.textContent = errorData.message || 'The requested page could not be found.';

    if (goBackLink) {
        const goBackHandler = (e) => {
            e.preventDefault();
            const previousPath = sessionStorage.getItem('previousPath') || '/';

            window.dispatchEvent(new CustomEvent('navigate', {
                detail: { path: previousPath }
            }));
        };

        goBackLink.addEventListener('click', goBackHandler);

        errorCleanupFunctions.push(() =>
            goBackLink.removeEventListener('click', goBackHandler)
        );
    }
}
