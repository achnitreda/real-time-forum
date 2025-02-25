let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

const messageCallbacks = new Set();
const statusCallbacks = new Set();
const typingCallbacks = new Set();

export const WebSocketService = {
    isInitialized: false,
    
    init() {
        if (this.isInitialized) return;
        
        // Make the WebSocketService available globally
        if (typeof window !== 'undefined') {
            window.WebSocketService = this;
            console.log("WebSocketService registered globally");
            this.isInitialized = true;
        }
        
        // Auto-reconnect on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !ws) {
                console.log("Auto-reconnect on visibility change")
                this.connect();
            }
        });
    },
    
    connect() {
        // Initialize first
        this.init();
        
        return new Promise((resolve, reject) => {
            if (ws) {
                resolve();
                return;
            }

            ws = new WebSocket(`ws://${window.location.host}/api/ws`);

            ws.onopen = () => {
                console.log('WebSocket connected');
                reconnectAttempts = 0;
                // Send a reconnection message to update online status
                ws.send(JSON.stringify({
                    type: 'reconnect',
                    payload: { is_online: true }
                }));
                this.notifyStatusCallbacks(true);
                resolve();
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                ws = null;
                this.notifyStatusCallbacks(false);
                this.attemptReconnect();
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    switch (data.type) {
                        case "session_expired":
                            this.handleSessionExpired();
                            break;
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
        });
    },

    handleSessionExpired() {
        this.disconnect();

        document.cookie = "Token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        window.dispatchEvent(new CustomEvent('navigate', {
            detail: { path: '/login' }
        }));
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
    },
};

// Initialize immediately
WebSocketService.init();