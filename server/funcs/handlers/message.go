package forum

import (
	"encoding/json"
	"net/http"
	"strconv"

	data "forum/funcs/database"
)

func MessagingHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Check authentication
	userID, isAuth := CheckIfCookieValid(w, r)
	if !isAuth {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Authentication required",
		})
		return
	}

	switch r.Method {
	case http.MethodGet:
		// Get conversations or messages
		if chatID := r.URL.Query().Get("chat_id"); chatID != "" {
			getMessages(w, r, userID, chatID)
		} else {
			getConversations(w, userID)
		}
	case http.MethodPost:
		// Send new message
		sendMessage(w, r, userID)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Method not allowed",
		})
	}

}

// getMessages retrieves messages for a specific chat
func getMessages(w http.ResponseWriter, r *http.Request, userID int, chatID string) {
	otherUserID, err := strconv.Atoi(chatID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid chat ID",
		})
		return
	}

	// Get pagination parameters
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	limit := 10

	messages, err := data.GetMessages(userID, otherUserID, limit, offset)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to fetch messages",
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"messages": messages,
		"hasMore":  len(messages) == limit,
	})
}

// getConversations retrieves all conversations for the user
func getConversations(w http.ResponseWriter, userID int) {
	// Get conversations with messages
	conversations, err := data.GetConversations(userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to fetch conversations",
		})
		return
	}

	// Get new users (without messages) in alphabetical order
	newUsers, err := data.GetNewUsers(userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to fetch new users",
		})
		return
	}

	response := struct {
		Conversations []data.Conversation `json:"conversations"`
		NewUsers      []data.Conversation `json:"newUsers"`
	}{
		Conversations: conversations,
		NewUsers:      newUsers,
	}

	json.NewEncoder(w).Encode(response)
}

func sendMessage(w http.ResponseWriter, r *http.Request, senderID int) {

	
	// Parse request body
	var msgRequest struct {
		ReceiverID int    `json:"receiver_id"`
		Content    string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&msgRequest); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid request format",
		})
		return
	}

	// Validate input
	if msgRequest.Content == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Message content cannot be empty",
		})
		return
	}

	if msgRequest.ReceiverID <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid receiver ID",
		})
		return
	}

	// Insert message
	messageID, err := data.InsertMessage(senderID, msgRequest.ReceiverID, msgRequest.Content)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to send message",
		})
		return
	}

	// Get the complete message details to return
	messages, err := data.GetMessages(senderID, msgRequest.ReceiverID, 1, 0)
	if err != nil || len(messages) == 0 {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to fetch sent message",
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": messages[0],
		"id":      messageID,
		"status":  "success",
	})
}

func UnreadMessagesCountHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, isAuth := CheckIfCookieValid(w, r)
	if !isAuth {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Authentication required",
		})
		return
	}

	count, err := data.GetUnreadMessagesCount(userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to fetch unread messages count",
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]int{
		"count": count,
	})
}


func MarkMessagesAsReadHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Check authentication
	userID, isAuth := CheckIfCookieValid(w, r)
	if !isAuth {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Authentication required",
		})
		return
	}

	// Only accept POST requests
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Method not allowed",
		})
		return
	}

	// Parse request body
	var request struct {
		SenderID int `json:"sender_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid request format",
		})
		return
	}

	// Mark messages as read
	err := data.MarkMessagesAsRead(userID, request.SenderID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to mark messages as read",
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
	})
}