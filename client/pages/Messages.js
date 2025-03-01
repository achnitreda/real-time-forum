const WebSocketService = window.WebSocketService;

let messageCleanupFunctions = [];
let currentOffset = 0;
let currentChatId = null;
let hasMoreMessages = true;
let isLoadingMessages = false;
let typingTimeout = null;
let lastScrollPosition = 0
let currentUserID = null;
let processedMessages = new Set();

export async function loadMessagesPage(container) {
    try {
        // Get current user's ID from auth status
        const response = await fetch('/api/user/status');
        const userData = await response.json();
        currentUserID = userData.userId;

        container.innerHTML = `
            <div class="messages-container">
                <div class="chat-sidebar">
                    <div class="chat-list" id="chatList"></div>
                </div>
                <div class="chat-main">
                    <div class="chat-header" id="chatHeader"></div>
                    <div class="chat-messages" id="chatMessages"></div>
                    <div class="chat-input" id="chatInput" style="display: none;">
                        <textarea 
                            placeholder="Type a message..." 
                            id="messageInput"
                        ></textarea>
                        <button id="sendButton">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Initialize WebSocket connection
        // await WebSocketService.connect();

        // initialize listeners
        // initializeWebSocketListeners();
        initializeMessageInput();
        initializeScrollListener();

        // Load conversations and new users
        await loadConversations(true);

        // Restore last active chat if exists
        const lastActiveChat = sessionStorage.getItem('lastActiveChat');
        if (lastActiveChat) {
            await loadChat(parseInt(lastActiveChat));
        }
    } catch (error) {
        console.error('Error loading messages page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        return () => cleanupMessageListeners();
    }
}

function cleanupMessageListeners() {
    // messageCleanupFunctions.forEach(cleanup => cleanup());
    // messageCleanupFunctions = [];
    // WebSocketService.disconnect();
    // processedMessages.clear();
}

export async function loadConversations(isMessagePage) {
    try {
        const response = await fetch('/api/messages');
        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }

        const data = await response.json();
        renderConversations(data.conversations, data.newUsers, isMessagePage);
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

function renderConversations(conversations, newUsers, isMessagePage) {

    const chatList = document.getElementById(isMessagePage ? "chatList" : "chatListPages");
    chatList.innerHTML = '';

    // Render active conversations
    if (conversations) {
        conversations.forEach(conv => {
            const conversationElement = createConversationElement(conv, false, isMessagePage);
            chatList.appendChild(conversationElement);
        });
    }

    // Add separator if there are new users
    if (newUsers?.length > 0) {
        const separator = document.createElement('div');
        separator.className = 'chat-list-separator';
        separator.textContent = 'New Contacts';
        chatList.appendChild(separator);

        // Render new users
        newUsers.forEach(user => {
            const userElement = createConversationElement(user, true, isMessagePage);
            chatList.appendChild(userElement);
        });
    }
}

function updatLastMessageInCahtList(senderId, message) {
    const chatLists = document.querySelectorAll(".chat-list-item");
    chatLists.forEach(chatItem => {
        if (chatItem.dataset.userId == senderId) {
            chatItem.children[1].children[1].textContent = message
        }
    })
}

function createConversationElement(conv, isNewUser = false, isMessagePage) {
    const div = document.createElement('div');
    div.className = 'chat-list-item';
    div.dataset.userId = conv.user_id;

    const statusClass = conv.is_online ? 'online' : 'offline';
    const lastMessage = isNewUser ? '' : `
        <div class="last-message">
            ${conv.last_message}
        </div>
        <span class="typing-indicator" id="typingIndicator"}></span>
        ${conv.unread_count ? `<span class="unread-count">${conv.unread_count}</span>` : ''}
    `;

    div.innerHTML = `
        <div class="user-status ${statusClass}"></div>
        <div class="chat-info">
            <div class="username">${conv.username}</div>
            ${lastMessage}
        </div>
    `;

    // div.addEventListener('click', () => loadChat(conv.user_id));
    if (isMessagePage) {
        div.addEventListener('click', () => loadChat(conv.user_id));
        // cleanups.push(() => removeEventListener('click', () => ""))
    } else {
        // initializeWebSocketListeners();
        div.addEventListener('click', () => {
            sessionStorage.setItem('lastActiveChat', conv.user_id);
            window.dispatchEvent(new CustomEvent('navigate', {
                detail: { path: '/messages' }
            }));
        });
    }
    return div;
}

async function loadChat(userId) {
    try {
        // console.log(`Loading chat with user ID: ${userId}`);
        processedMessages.clear();

        currentChatId = userId;
        sessionStorage.setItem('lastActiveChat', userId);
        currentOffset = 0;
        hasMoreMessages = true;

        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');
        const chatHeader = document.getElementById('chatHeader');

        chatMessages.innerHTML = '';
        chatInput.style.display = 'flex';

        // Update header
        const userElement = document.querySelector(`.chat-list-item[data-user-id="${userId}"]`);
        const username = userElement.querySelector('.username').textContent;

        chatHeader.innerHTML = `
        <div class="chat-header-info">
            <span class="username">${username}</span>
        </div>
    `;

        // Load initial messages
        await loadMessages();

        // Mark messages as read
        await markMessagesAsRead(userId);

    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

async function loadMessages(append = false) {
    if (isLoadingMessages || !hasMoreMessages) return;

    try {
        isLoadingMessages = true;
        const response = await fetch(`/api/messages?chat_id=${currentChatId}&offset=${currentOffset}`);
        const data = await response.json();

        if (!data.messages || data.messages.length === 0) {
            hasMoreMessages = false;
            return;
        }

        renderMessages(data.messages, currentUserID, append);
        currentOffset += data.messages.length;
        hasMoreMessages = data.hasMore;

    } catch (error) {
        console.error('Error loading messages:', error);
    } finally {
        isLoadingMessages = false;
    }
}

function renderMessages(messages, currentUserID, append = false) {
    const chatMessages = document.getElementById('chatMessages');
    // to prevent Browser from repaint itself each time we create a msg
    const fragment = document.createDocumentFragment();

    messages.forEach(msg => {
        const msgEle = createMessageElement(msg, currentUserID);
        fragment.appendChild(msgEle);
    });

    if (append) {
        chatMessages.insertBefore(fragment, chatMessages.firstChild);
        console.log("Appended messages at top");
    } else {
        chatMessages.appendChild(fragment);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log("Added messages at bottom");
    }
}

function createMessageElement(message, currentUserID) {
    const div = document.createElement('div');
    const isSender = message.sender_id === currentUserID; // Compare with current user's ID
    div.className = `message ${isSender ? 'sent' : 'received'}`;

    const timestamp = new Date(message.sent_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    div.innerHTML = `
        <div class="message-content">
            <div style="font-weight: bold">${message.sender_name}:</div>
            ${message.content}
            <span class="message-time">${timestamp}</span>
        </div>
    `;

    return div;
}

async function markMessagesAsRead(senderId) {
    try {
        console.log(`Marking messages from sender ${senderId} as read`);
        const response = await fetch(`/api/messages/mark-read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sender_id: senderId })
        });

        if (response.ok) {
            console.log("Messages marked as read successfully");

            // Update the unread badge in conversation list
            const userElement = document.querySelector(`.chat-list-item[data-user-id="${senderId}"]`);
            if (userElement) {
                const unreadBadge = userElement.querySelector('.unread-count');
                if (unreadBadge) {
                    unreadBadge.remove();
                }
            }

            // Update the header notification badge
            if (typeof window.updateUnreadBadge === 'function') {
                window.updateUnreadBadge();
                console.log("Header badge updated after marking messages as read");
            } else {
                console.warn("updateUnreadBadge function not available");
            }
        } else {
            console.error("Failed to mark messages as read", await response.text());
        }
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

export function initializeWebSocketListeners() {
    const messageCleanup = WebSocketService.onMessage(message => {
        // console.log("WebSocket message received:", message);

        const messageId = `${message.id}-${message.sender_id}-${message.receiver_id}`;
        // console.log(currentChatId, currentUserID);

        // Skip if we've already processed this message
        if (processedMessages.has(messageId)) {
            return;
        }

        processedMessages.add(messageId);
        console.log(currentChatId, message.sender_id, message.receiver_id, currentUserID);
        if (window.location.pathname == "/messages") {
            if (currentChatId !== null &&
                (message.sender_id === currentChatId || message.receiver_id === currentChatId)) {
                renderMessages([message], currentUserID);
                // console.log("Rendered new message in current chat");
    
                // If the current chat is open and we're the receiver, mark as read
                if (message.receiver_id === currentUserID && message.sender_id === currentChatId) {
                    markMessagesAsRead(currentChatId);
                }
                updatLastMessageInCahtList(message.sender_id, message.content)
            } else if (message.receiver_id === currentUserID) {
                // If the message is for the current user but not in current chat, update conversation list
                // console.log("Message for current user but not in current chat");
                /*if (window.location.pathname == "/messages")*/ updateConversationList(true)
                // else updateConversationList(false)
            }
        } else loadConversations(false)
    });

    const statusCleanup = WebSocketService.onStatusChange(({ user_id, is_online }) => handleStatusChange(user_id, is_online));



    const typingCleanup = WebSocketService.onTypingStatus(({ user_id, is_typing }) => handleTyping(user_id, is_typing));

    // messageCleanupFunctions.push(messageCleanup, statusCleanup, typingCleanup);
}

export function handleStatusChange(user_id, is_online) {
    const userElement = document.querySelector(`.chat-list-item[data-user-id="${user_id}"]`);
    if (userElement) {
        const statusDot = userElement.querySelector('.user-status');
        statusDot.className = `user-status ${is_online ? 'online' : 'offline'}`;
    }
}

export function handleTyping(user_id, is_typing) {
    // if (user_id === currentChatId) {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            if (is_typing) {
                typingIndicator.innerHTML = `
                    <span class="typing-dots">
                        typing<span>.</span><span>.</span><span>.</span>
                    </span>`;
            } else {
                typingIndicator.textContent = '';
            }
        }
    // }
}

function initializeMessageInput() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    if (!messageInput || !sendButton) {
        console.warn("Message input elements not found");
        return;
    }

    const sendMessage = () => {
        const content = messageInput.value.trim();
        if (!content) return;

        if (WebSocketService.sendMessage(currentChatId, content)) {
            messageInput.value = '';
        }
    };

    sendButton.addEventListener('click', sendMessage);

    const inputHandler = () => {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        WebSocketService.updateTypingStatus(currentChatId, true);
        typingTimeout = setTimeout(() => {
            WebSocketService.updateTypingStatus(currentChatId, false);
        }, 1000);
    };

    const keypressHandler = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    messageInput.addEventListener('input', throttle(inputHandler, 300));
    messageInput.addEventListener('keypress', keypressHandler);

    messageCleanupFunctions.push(
        () => sendButton.removeEventListener('click', sendMessage),
        () => messageInput.removeEventListener('input', inputHandler),
        () => messageInput.removeEventListener('keypress', keypressHandler)
    );
}

function initializeScrollListener() {
    const chatMessages = document.getElementById('chatMessages');

    if (!chatMessages) {
        console.warn("Chat messages element not found");
        return;
    }

    const scrollHandler = () => {
        if (chatMessages.scrollTop <= 100 && hasMoreMessages && !isLoadingMessages) {
            lastScrollPosition = chatMessages.scrollHeight - chatMessages.scrollTop;
            loadMessages(true).then(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight - lastScrollPosition;
            });
        }
    };

    chatMessages.addEventListener('scroll', throttle(scrollHandler, 200));
    messageCleanupFunctions.push(
        () => chatMessages.removeEventListener('scroll', scrollHandler)
    );
}

const throttle = (func, limit) => {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

async function updateConversationList(isMessagePage) {
    await loadConversations(isMessagePage);
}