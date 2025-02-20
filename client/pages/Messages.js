import { WebSocketService } from '../services/websocket.js';

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
        cleanupMessageListeners();


        // Get current user's ID from auth status
        const response = await fetch('/api/user/status');
        const userData = await response.json();
        currentUserID = userData.userId;

        // Add CSS classes for the messages page
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
        await WebSocketService.connect();

        // initialize listeners
        initializeWebSocketListeners()
        initializeMessageInput()
        initializeScrollListener()

        // Load conversations and new users
        await loadConversations();

        return () => cleanupMessageListeners();
    } catch (error) {
        console.error('Error loading messages page:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        return () => cleanupMessageListeners();
    }
}

function cleanupMessageListeners() {
    messageCleanupFunctions.forEach(cleanup => cleanup());
    messageCleanupFunctions = [];
    WebSocketService.disconnect();
    processedMessages.clear(); 
}

async function loadConversations() {
    try {
        const response = await fetch('/api/messages');
        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }

        const data = await response.json();
        renderConversations(data.conversations, data.newUsers);
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

function renderConversations(conversations, newUsers) {
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '';

    // Render active conversations
    if (conversations) {
        conversations.forEach(conv => {
            const conversationElement = createConversationElement(conv);
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
            const userElement = createConversationElement(user, true);
            chatList.appendChild(userElement);
        });
    }
}

function createConversationElement(conv, isNewUser = false) {
    const div = document.createElement('div');
    div.className = 'chat-list-item';
    div.dataset.userId = conv.user_id;

    const statusClass = conv.is_online ? 'online' : 'offline';
    const lastMessage = isNewUser ? '' : `
        <div class="last-message">
            ${conv.last_message || 'No messages yet'}
        </div>
        ${conv.unread_count ? `<span class="unread-count">${conv.unread_count}</span>` : ''}
    `;

    div.innerHTML = `
        <div class="user-status ${statusClass}"></div>
        <div class="chat-info">
            <div class="username">${conv.username}</div>
            ${lastMessage}
        </div>
    `;

    div.addEventListener('click', () => loadChat(conv.user_id))
    return div;
}

async function loadChat(userId) {
    try {
        processedMessages.clear(); 

        currentChatId = userId;
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
                <span class="typing-indicator" id="typingIndicator"></span>
            </div>
        `;

        // Load initial messages
        await loadMessages();

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
    const chatMessages = document.getElementById('chatMessages')
    // to prevent Browser from repaint it self each time we create a msg
    const fragment = document.createDocumentFragment()

    messages.forEach(msg => {
        const msgEle = createMessageElement(msg, currentUserID)
        fragment.appendChild(msgEle);
    })

    if (append) {
        chatMessages.insertBefore(fragment, chatMessages.firstChild)
        console.log("append")
    } else {
        chatMessages.appendChild(fragment)
        chatMessages.scrollTop = chatMessages.scrollHeight
        console.log("la")
    }
}

function createMessageElement(message, currentUserID) {
    const div = document.createElement('div');
    const isSender = message.sender_id === currentUserID; // Compare with current user's ID
    div.className = `message ${isSender ? 'sent' : 'received'}`;

    const timestamp = new Date(message.sent_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    })

    div.innerHTML = `
        <div class="message-content">
            <div style="font-weight: bold">${message.sender_name}:</div>
            ${message.content}
            <span class="message-time">${timestamp}</span>
        </div>
    `;

    return div
}

function initializeWebSocketListeners() {
    const messageCleanup = WebSocketService.onMessage(message => {

        const messageId = `${message.id}-${message.sender_id}-${message.receiver_id}`;

        // Skip if we've already processed this message
        if (processedMessages.has(messageId)) {
            return;
        }

        processedMessages.add(messageId)

        if (currentChatId !== null &&
            (message.sender_id === currentChatId || message.receiver_id === currentChatId)) {
            renderMessages([message], currentUserID);
            console.log("render msg");
        }
        updateConversationList();
    })

    const statusCleanup = WebSocketService.onStatusChange(({ user_id, is_online }) => {
        const userElement = document.querySelector(`.chat-list-item[data-user-id="${user_id}"]`)
        if (userElement) {
            const statusDot = userElement.querySelector('.user-status');
            statusDot.className = `user-status ${is_online ? 'online' : 'offline'}`;
        }
    })

    const typingCleanup = WebSocketService.onTypingStatus(({ user_id, is_typing }) => {
        if (user_id === currentChatId) {
            const typingIndicator = document.getElementById('typingIndicator');
            typingIndicator.textContent = is_typing ? 'typing...' : '';
        }
    });

    messageCleanupFunctions.push(messageCleanup, statusCleanup, typingCleanup)
}

function initializeMessageInput() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    const sendMessage = () => {
        const content = messageInput.value.trim();
        if (!content) return;

        if (WebSocketService.sendMessage(currentChatId, content)) {
            messageInput.value = '';
        }
    }

    sendButton.addEventListener('click', sendMessage);

    const inputHandler = () => {
        if (typingTimeout) {
            clearTimeout(typingTimeout)
        }
        WebSocketService.updateTypingStatus(currentChatId, true)
        typingTimeout = setTimeout(() => {
            WebSocketService.updateTypingStatus(currentChatId, false);
        }, 1000);
    }

    messageInput.addEventListener('input', throttle(inputHandler, 300));
    messageInput.addEventListener('keypress', (e) => {
        if (e.key == 'Enter' && !e.shiftkey) {
            e.preventDefault()
            sendMessage()
        }
    })

    messageCleanupFunctions.push(
        () => sendButton.removeEventListener('click', sendMessage),
        () => messageInput.removeEventListener('input', inputHandler),
        () => messageInput.removeEventListener('keypress', sendMessage)
    );
}

function initializeScrollListener() {
    const chatMessages = document.getElementById('chatMessages');

    const scrollHandler = () => {
        if (chatMessages.scrollTop <= 100 && hasMoreMessages && !isLoadingMessages) {
            lastScrollPosition = chatMessages.scrollHeight - chatMessages.scrollTop;
            loadMessages(true).then(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight - lastScrollPosition;
            });
        }
    }

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

async function updateConversationList() {
    await loadConversations()
}