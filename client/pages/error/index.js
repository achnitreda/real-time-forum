export async function loadErrorPage(container, errorData) {
    try {
        // Load HTML & CSS
        const htmlResponse = await fetch('/client/pages/error/error.html');
        const html = await htmlResponse.text();
        const cssResponse = await fetch('/client/pages/error/error.css');
        const css = await cssResponse.text();
        
        // Add CSS to head
        const styleSheet = document.createElement('style');
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);
        
        // Set HTML content
        container.innerHTML = html;
        
        // Initialize error page with error data
        initializeErrorPage(errorData);
    } catch (error) {
        console.error('Error loading error page:', error);
        // Fallback error display
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h1>Error</h1>
                <p>Something went wrong. Please try again later.</p>
            </div>
        `;
    }
}

function initializeErrorPage(errorData = {}) {
    // Set error details
    const statusElement = document.getElementById('errstatus');
    const titleElement = document.getElementById('errtitle');
    const messageElement = document.getElementById('errmessage');
    const goBackLink = document.getElementById('goBackLink');

    // Update error information
    if (statusElement) statusElement.textContent = errorData.status || '404';
    if (titleElement) titleElement.textContent = errorData.title || 'Page Not Found';
    if (messageElement) messageElement.textContent = errorData.message || 'The requested page could not be found.';

    // Handle go back functionality
    if (goBackLink) {
        goBackLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/';
            }
        });
    }
}