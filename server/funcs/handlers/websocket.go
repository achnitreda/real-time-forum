package forum

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"

	data "forum/funcs/database"
)

type WebSocketMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type WebSocketManager struct {
	connections map[int][]*websocket.Conn

	mu sync.RWMutex
}

var (
	wsManager = &WebSocketManager{
		connections: make(map[int][]*websocket.Conn),
	}

	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		// basicly this implementation
		// it just a reminder to properly check it in production
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins in development
		},
	}
)

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	userID, isAuth := CheckIfCookieValid(w, r)
	if !isAuth {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading to WebSocket: %v", err)
		return
	}

	// Register the new connection
	wsManager.registerConnection(userID, conn)

	// Update user's online status
	data.UpdateUserOnlineStatus(userID, true)

	// Broadcast online status to other users
	wsManager.broadcastOnlineStatus(userID, true)

	// Handle incoming messages in a goroutine
	go wsManager.handleMessages(userID, conn)
}

func (wm *WebSocketManager) registerConnection(userID int, conn *websocket.Conn) {
	wm.mu.Lock()
	defer wm.mu.Unlock()

	// Initialize slice if it doesn't exist
	if _, exists := wm.connections[userID]; !exists {
		wm.connections[userID] = make([]*websocket.Conn, 0)
	}

	wm.connections[userID] = append(wm.connections[userID], conn)
}

func (wm *WebSocketManager) broadcastOnlineStatus(userID int, isOnline bool) {
	notification := WebSocketMessage{
		Type: "online_status",
		Payload: map[string]interface{}{
			"user_id":   userID,
			"is_online": isOnline,
		},
	}

	wm.broadcastToAll(notification, userID)
}

func (wm *WebSocketManager) broadcastToAll(msg WebSocketMessage, excludeUserID int) {
	wm.mu.RLock()
	defer wm.mu.RUnlock()

	for userID, connections := range wm.connections {
        if userID != excludeUserID {
            for _, conn := range connections {
                if err := conn.WriteJSON(msg); err != nil {
                    log.Printf("Error broadcasting to user %d: %v", userID, err)
                }
            }
        }
    }
}

func (wm *WebSocketManager) handleMessages(userID int, conn *websocket.Conn) {
	defer func() {
		wm.removeConnection(userID,conn)
	}()

	for {
		// Read Message
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseGoingAway, // User closed tab/browser
				//Connection lost unexpectedly
				websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			return
		}

		if messageType == websocket.TextMessage {
			var msg WebSocketMessage
			if err := json.Unmarshal(p, &msg); err != nil {
				log.Printf("Error unmarshaling message: %v", err)
				continue
				// Skip this message, wait for next one. Skips invalid message
				// Goes back to waiting for next message
			}

			// Handle different message types
			switch msg.Type {
			case "new_message":
				wm.handleNewMessage(userID, msg.Payload)
			case "typing":
				wm.handleTypingStatus(userID, msg.Payload)
			}
		}
	}
}

func (wm *WebSocketManager) removeConnection(userID int, conn *websocket.Conn) {
	wm.mu.Lock()
	defer wm.mu.Unlock()

	connections, exists := wm.connections[userID]
	if !exists {
		return
	}

	// Find and remove the specific connection
	for i, c := range connections {
		if c == conn {
			// Remove this connection from the slice
			wm.connections[userID] = append(connections[:i], connections[i+1:]...)
			break
		}
	}

	// If no more connections for this user, remove the user entry and update status
	if len(wm.connections[userID]) == 0 {
		delete(wm.connections, userID)
		data.UpdateUserOnlineStatus(userID, false)
		wm.broadcastOnlineStatus(userID, false)
	}

}

func (wm *WebSocketManager) handleNewMessage(senderID int, payload interface{}) {
	payloadBytes, _ := json.Marshal(payload)
	var messageData struct {
		ReceiverID int    `json:"receiver_id"`
		Content    string `json:"content"`
	}
	if err := json.Unmarshal(payloadBytes, &messageData); err != nil {
		log.Printf("Error unmarshaling message payload: %v", err)
		return
	}

	// Store message in database
	_, err := data.InsertMessage(senderID, messageData.ReceiverID, messageData.Content)
	if err != nil {
		log.Printf("Error storing message: %v", err)
		return
	}

	// Get complete message details
	messages, err := data.GetMessages(senderID, messageData.ReceiverID, 1, 0)
	if err != nil || len(messages) == 0 {
		log.Printf("Error fetching sent message: %v", err)
		return
	}

	// Prepare message notification
	notification := WebSocketMessage{
		Type:    "new_message",
		Payload: messages[0],
	}

	// Send to receiver if online
	wm.sendToUser(messageData.ReceiverID, notification)
	wm.sendToUser(senderID, notification)
}

func (wm *WebSocketManager) sendToUser(userID int, msg WebSocketMessage) {
	wm.mu.RLock()
    connections, exists := wm.connections[userID]
    wm.mu.RUnlock()

	if exists {
        for _, conn := range connections {
            if err := conn.WriteJSON(msg); err != nil {
                log.Printf("Error sending message to user %d: %v", userID, err)
                wm.removeConnection(userID, conn)
            }
        }
    }
}

func (wm *WebSocketManager) handleTypingStatus(userID int, payload interface{}) {
	payloadBytes, _ := json.Marshal(payload)
	var typingData struct {
		ReceiverID int  `json:"receiver_id"`
		IsTyping   bool `json:"is_typing"`
	}
	if err := json.Unmarshal(payloadBytes, &typingData); err != nil {
		return
	}

	notification := WebSocketMessage{
		Type: "typing_status",
		Payload: map[string]interface{}{
			"user_id":   userID,
			"is_typing": typingData.IsTyping,
		},
	}

	wm.sendToUser(typingData.ReceiverID, notification)
}
