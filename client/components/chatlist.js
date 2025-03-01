import { handleTyping, loadConversations, handleStatusChange } from "../pages/Messages.js";

const cleanups = []

export async function renderChatList() {
    // console.log("x");
    
    // const chatList = document.createElement("div");
    // chatList.id = "chatList";
    // chatList.classList.add("chat-list")
    // app.appendChild(chatList)
    await loadConversations(false)
    // WebSocketService.onMessage(() => loadConversations(false))
    // WebSocketService.onTypingStatus(({user_id, is_typing}) => handleTyping(user_id, is_typing))
    // WebSocketService.onStatusChange(({ user_id, is_online }) => handleStatusChange(user_id, is_online))

    return cleanups
}

// async function loadConversations(chatElement) {
//     try {
//         const response = await fetch('/api/messages');
//         if (!response.ok) {
//             throw new Error('Failed to load conversations');
//         }

//         const data = await response.json();
//         console.log(data);
        
//         renderConversations(data.conversations, data.newUsers);
//     } catch (error) {
//         console.error('Error loading conversations:', error);
//     }
// }

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

function createConversationElement(conv, isNewUser = false, isMessagePage) {
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

    if (isMessagePage) {
        div.addEventListener('click', () => console.log("hello"));
        cleanups.push(() => removeEventListener('click', () => ""))
    } else {
        div.addEventListener('click', () => {
            
        });
    }
    
    return div;
}


