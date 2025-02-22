export async function renderHeader() {
    try {
        const header = document.getElementById('header');
        header.innerHTML = `
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
        initializeHeaderForms();
    } catch (error) {
        console.error('Error rendering header:', error);
    }
}

function initializeHeaderForms() {
    const headerForm = document.querySelector('.head form');

    const formSubmitHandler = async (e) => {
        e.preventDefault();
        const button = e.submitter;
        const action = button.dataset.action;

        const validActions = ['posting', 'messages', 'logout'];
        if (!validActions.includes(action)) {
            console.error('Invalid action:', action);
            return;
        }

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
}
