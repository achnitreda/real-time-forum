export async function renderHeader() {
    try {
        // Check login status
        const response = await fetch('/api/user/status');
        const data = await response.json();

        const header = document.getElementById('header');
        header.innerHTML = createHeaderContent();

        if (data.isLoggedIn) {
            initializeHeaderForms();
        }
    } catch (error) {
        console.error('Error rendering header:', error);
    }
}

function createHeaderContent() {
    const loggedInContent = `
        <header class="head">
            <a class="logo" href="/">Forum</a>
            <div>
                <form method="post">
                    <div class="rightBtns">
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

    headerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.submitter;
        const action = button.dataset.action;

        if (action === 'posting') {
            const navigationEvent = new CustomEvent('navigate', {
                detail: { path: '/posting' }
            });
            window.dispatchEvent(navigationEvent);
        } else if (action === 'logout') {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST'
                });

                if (response.ok) {
                    const navigationEvent = new CustomEvent('navigate', {
                        detail: { path: '/login' }
                    });
                    window.dispatchEvent(navigationEvent);
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    });
}