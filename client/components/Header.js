let headerCleanupFunctions = [];

export async function renderHeader() {
    try {

        cleanupHeaderListeners();

        // Check login status
        const response = await fetch('/api/user/status');
        const data = await response.json();

        const header = document.getElementById('header');
        header.innerHTML = createHeaderContent();

        if (data.isLoggedIn) {
            initializeHeaderForms();
        }

        return () => cleanupHeaderListeners();
    } catch (error) {
        console.error('Error rendering header:', error);
        return () => cleanupHeaderListeners();
    }
}

function cleanupHeaderListeners() {
    headerCleanupFunctions.forEach(cleanup => cleanup());
    headerCleanupFunctions = [];
}

function createHeaderContent() {
    const loggedInContent = `
        <header class="head">
            <a class="logo" href="/">Forum</a>
            <div>
                <form method="post">
                    <div class="rightBtns">
                        <label>
                            <i class="fa-regular fa-comments"></i>
                            <input
                                type="submit"
                                class="postbtn"
                                data-action="messages"
                            />
                        </label>
                        <label>
                            <i class="fa-regular fa-pen-to-square"></i>
                            <input
                                type="submit"
                                class="postbtn"
                                data-action="posting"
                            />
                        </label>
                        <label>
                            <i class="fa-solid fa-power-off"></i>
                            <input
                                type="submit"
                                value=""
                                class="postbtn"
                                data-action="logout"
                            />
                        </label>
                    </div>
                </form>
            </div>
        </header>
    `;

    return loggedInContent;
}

function initializeHeaderForms() {
    const headerForm = document.querySelector('.head form');

    const formSubmitHandler = async (e) => {
        e.preventDefault();
        const button = e.submitter;
        const action = button.dataset.action;

        switch (action) {
            case 'posting':
                window.dispatchEvent(new CustomEvent('navigate', {
                    detail: { path: '/posting' }
                }));
                break;
            case 'messages':
                window.dispatchEvent(new CustomEvent('navigate', {
                    detail: { path: '/messages' }
                }));
                break;
            case 'logout':
                try {
                    const response = await fetch('/api/logout', {
                        method: 'POST'
                    });

                    if (response.ok) {
                        window.dispatchEvent(new CustomEvent('navigate', {
                            detail: { path: '/login' }
                        }));
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                }
                break;
        }
    };

    headerForm.addEventListener('submit', formSubmitHandler);

    headerCleanupFunctions.push(() =>
        headerForm.removeEventListener('submit', formSubmitHandler)
    );
}
