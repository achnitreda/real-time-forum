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
	connections map[int]*websocket.Conn

	mu sync.RWMutex
}

var (
	wsManager = &WebSocketManager{
		connections: make(map[int]*websocket.Conn),
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
	defer wm.mu.Lock()

	if existingConn, exists := wm.connections[userID]; exists {
		existingConn.Close()
	}

	wm.connections[userID] = conn
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

	for userID, conn := range wm.connections {
		if userID != excludeUserID {
			if err := conn.WriteJSON(msg); err != nil {
				log.Printf("Error broadcasting to user %d: %v", userID, err)
			}
		}
	}
}

func (wm *WebSocketManager) handleMessages(userID int, conn *websocket.Conn) {
	defer func() {
		wm.removeConnection(userID)
		data.UpdateUserOnlineStatus(userID, false)
		wm.broadcastOnlineStatus(userID, false)
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
				// Skip this message, wait for next one
				// Skips invalid message
    			// Goes back to waiting for next message
			}

			// Handle different message types
			switch msg.Type {
			case "new_message":
				// handleNewMessage
			case "typing":
				// handleTypingStatus
			}
		}
	}
}

func (wm *WebSocketManager) removeConnection(userID int) {
	wm.mu.Lock()
	defer wm.mu.Unlock()

	if conn, exists := wm.connections[userID]; exists {
		conn.Close()
		delete(wm.connections, userID)
	}
}
