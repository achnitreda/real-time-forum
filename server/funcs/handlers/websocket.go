package forum

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	data "forum/funcs/database"
)

type WebSocketMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type WebSocketManager struct {
	connections map[int][]*websocket.Conn
	tokens      map[int]string
	mu          sync.RWMutex
}

var (
	wsManager = &WebSocketManager{
		connections: make(map[int][]*websocket.Conn),
		tokens:      make(map[int]string),
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

	// log.Printf("WebSocket connection attempt for user_id: %d", userID)
	cookie, _ := r.Cookie("Token")
	fmt.Println("cookie ->", cookie.Value)

	wsManager.mu.Lock()
	if existingConns, exists := wsManager.connections[userID]; exists {
		oldToken := wsManager.tokens[userID]
		if oldToken != cookie.Value {
			for _, conn := range existingConns {
				conn.WriteJSON(WebSocketMessage{
					Type: "session_expired",
					Payload: map[string]string{
						"message": "Session expired due to new login",
					},
				})
				conn.Close()
			}
			delete(wsManager.connections, userID)
		}
	}
	wsManager.mu.Unlock()

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading to WebSocket: %v", err)
		return
	}

	// Register the new connection
	wsManager.registerConnection(userID, conn, cookie.Value)

	// Update user's online status
	if err := data.UpdateUserOnlineStatus(userID, true); err != nil {
		// log.Printf("Error updating online status for user_id: %d: %v", userID, err)
	} else {
		log.Printf("Successfully updated online status for user_id: %d", userID)
	}

	// Broadcast online status to other users
	wsManager.broadcastOnlineStatus(userID, true)

	// Handle incoming messages in a goroutine
	go wsManager.handleMessages(userID, conn)
}

func (wm *WebSocketManager) registerConnection(userID int, conn *websocket.Conn, token string) {
	wm.mu.Lock()
	defer wm.mu.Unlock()

	// Initialize slice if it doesn't exist
	if _, exists := wm.connections[userID]; !exists {
		wm.connections[userID] = make([]*websocket.Conn, 0)
	}

	wm.connections[userID] = append(wm.connections[userID], conn)
	wm.tokens[userID] = token
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
		wm.removeConnection(userID, conn)
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

			// Check token validity before processing
			wm.mu.RLock()
			currentToken := wm.tokens[userID]
			wm.mu.RUnlock()

			u, err := data.GetUserIDFromToken(currentToken)
			if err != nil {
				conn.WriteJSON(WebSocketMessage{
					Type: "session_expired",
					Payload: map[string]string{
						"message": "Session expired",
					},
				})
				return
			}
			fmt.Println("-->", wm.tokens)
			fmt.Println("-->", u, currentToken)

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
			case "reconnect":
				// Update online status on reconnection
				if err := data.UpdateUserOnlineStatus(userID, true); err != nil {
					log.Printf("Error updating online status on reconnect for user_id: %d: %v", userID, err)
				} else {
					log.Printf("Successfully updated online status on reconnect for user_id: %d", userID)
				}
				wm.broadcastOnlineStatus(userID, true)
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
			wm.connections[userID] = append(connections[:i], connections[i+1:]...)
			break
		}
	}

	// If no more connections and it's not a reconnection attempt
	if len(wm.connections[userID]) == 0 {
		delete(wm.connections, userID)
		delete(wm.tokens, userID)
		// Add a small delay to prevent race condition with reconnection
		go func() {
			time.Sleep(1 * time.Second)
			if _, exists := wm.connections[userID]; !exists {
				data.UpdateUserOnlineStatus(userID, false)
				wm.broadcastOnlineStatus(userID, false)
			}
		}()
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
