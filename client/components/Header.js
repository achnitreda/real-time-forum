import { performLogout } from "../services/websocket.js";

export async function renderHeader() {
    try {
        const header = document.getElementById('header');

        // Fetch unread message count
        const unreadCount = await fetchUnreadMessageCount();

        header.innerHTML = `
        <header class="head">
            <a class="logo" href="/">Forum</a>
            <div>
                <form method="post">
                    <div class="rightBtns">
                        <label class="message-label">
                            <i class="fa-regular fa-comments"></i>
                            ${unreadCount > 0 ? `<span class="notification-badge">${unreadCount}</span>` : ''}
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

        // Initialize notification WebSocket
        setupNotificationListener();

        // Initialize form handlers
        initializeHeaderForms();

        // Make update function globally available
        window.updateUnreadBadge = updateUnreadBadge;
        console.log("updateUnreadBadge registered globally");
    } catch (error) {
        console.error('Error rendering header:', error);
    }
}

async function fetchUnreadMessageCount() {
    try {
        const response = await fetch('/api/messages/unread-count');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched unread count:", data.count);
        return data.count || 0;
    } catch (error) {
        console.error('Error fetching unread message count:', error);
        return 0;
    }
}

function setupNotificationListener() {
    // WebSocketService is now guaranteed to be available from app.js
    if (window.WebSocketService) {
        console.log("Setting up notification listener in header");

        window.WebSocketService.onMessage(() => {
            // console.log("Message received in header, updating badge");
            updateUnreadBadge();
        });
    } else {
        console.warn("WebSocketService not available for notifications");

        // Try again after a short delay
        setTimeout(setupNotificationListener, 500);
    }
}

async function updateUnreadBadge() {
    try {
        console.log("Updating unread badge");
        const count = await fetchUnreadMessageCount();

        const badge = document.querySelector('.notification-badge');
        const messageLabel = document.querySelector('.message-label');

        if (!messageLabel) {
            console.warn("Message label not found in DOM");
            return;
        }

        if (count > 0) {
            if (badge) {
                badge.textContent = count;
                console.log("Updated existing badge to:", count);
            } else {
                const newBadge = document.createElement('span');
                newBadge.className = 'notification-badge';
                newBadge.textContent = count;
                messageLabel.appendChild(newBadge);
                console.log("Created new badge with count:", count);
            }
        } else if (badge) {
            badge.remove();
            console.log("Removed badge as count is zero");
        }
    } catch (error) {
        console.error("Error updating badge:", error);
    }
}

function initializeHeaderForms() {
    const headerForm = document.querySelector('.head form');

    if (!headerForm) {
        console.warn("Header form not found");
        return;
    }

    const formSubmitHandler = async (e) => {
        e.preventDefault();
        const button = e.submitter;
        if (!button) {
            console.warn("No submitter found in event");
            return;
        }

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
                performLogout()
                break;
        }
    };

    headerForm.addEventListener('submit', formSubmitHandler);
}
