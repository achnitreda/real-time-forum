let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

const messageCallbacks = new Set();
const statusCallbacks = new Set();
const typingCallbacks = new Set();

export const WebSocketService = {
    connect() {
        if (ws) return;

        ws = new WebSocket(`ws://${window.location.host}/api/ws`);

        ws.onopen = () => {
            console.log('WebSocket connected');
            reconnectAttempts = 0;
            this.notifyStatusCallbacks(true);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            ws = null;
            this.notifyStatusCallbacks(false);
            this.attemptReconnect();
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case 'new_message':
                        messageCallbacks.forEach(callback => callback(data.payload));
                        break;
                    case 'online_status':
                        statusCallbacks.forEach(callback => callback(data.payload));
                        break;
                    case 'typing_status':
                        typingCallbacks.forEach(callback => callback(data.payload));
                        break;
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };
    },

    disconnect() {
        if (ws) {
            ws.close();
            ws = null;
        }
    },

    attemptReconnect() {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log('Max reconnection attempts reached');
            return;
        }

        setTimeout(() => {
            reconnectAttempts++;
            console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            this.connect();
        }, RECONNECT_DELAY);
    },

    sendMessage(receiverId, content) {
        if (!ws) return false;
        
        ws.send(JSON.stringify({
            type: 'new_message',
            payload: {
                receiver_id: receiverId,
                content: content
            }
        }));
        return true;
    },

    updateTypingStatus(receiverId, isTyping) {
        if (!ws) return;

        ws.send(JSON.stringify({
            type: 'typing',
            payload: {
                receiver_id: receiverId,
                is_typing: isTyping
            }
        }));
    },

    // Callback registration methods
    onMessage(callback) {
        messageCallbacks.add(callback);
        return () => messageCallbacks.delete(callback);
    },

    onStatusChange(callback) {
        statusCallbacks.add(callback);
        return () => statusCallbacks.delete(callback);
    },

    onTypingStatus(callback) {
        typingCallbacks.add(callback);
        return () => typingCallbacks.delete(callback);
    },

    notifyStatusCallbacks(isOnline) {
        statusCallbacks.forEach(callback => callback({ is_online: isOnline }));
    }
};

// Auto-reconnect on visibility change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !ws) {
        WebSocketService.connect();
    }
});