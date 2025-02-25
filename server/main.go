package main

import (
	"encoding/json"
	"fmt"
	forum "forum/funcs"
	data "forum/funcs/database"
	handlers "forum/funcs/handlers"
	"net/http"
	"strings"
)

func main() {
	err := data.CreateDB()
	if err != nil {
		fmt.Println(err)
		return
	}

	// auth
	http.HandleFunc("/api/login", handlers.AuthLG(handlers.Login))
	http.HandleFunc("/api/register", handlers.AuthLG(handlers.Register))
	http.HandleFunc("/api/logout", handlers.Auth(handlers.Logout))
	http.HandleFunc("/api/user/status", CheckAuthStatus)
	http.HandleFunc("/api/user/status/offline", SetUserOfflineHandler)

	// static files
	http.HandleFunc("/client/", forum.StaticFileHandler)

	http.HandleFunc("/api/home", handlers.Home)
	http.HandleFunc("/api/filter", handlers.FilterHandler)
	http.HandleFunc("/api/like-dislike", handlers.HandleLikeDislike)

	http.HandleFunc("/api/comment", handlers.Commenting)
	http.HandleFunc("/api/comment/more", handlers.LoadMoreComments)

	http.HandleFunc("/api/posting", handlers.Auth(handlers.Posting))

	// Messaging routes
	http.HandleFunc("/api/messages", handlers.MessagingHandler)
	http.HandleFunc("/api/messages/unread-count", handlers.UnreadMessagesCountHandler)
	http.HandleFunc("/api/messages/mark-read", handlers.MarkMessagesAsReadHandler)
	http.HandleFunc("/api/ws", handlers.HandleWebSocket)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "../client/index.html")
	})

	fmt.Println("http://localhost:8081/")
	http.ListenAndServe(":8081", nil)
}

// api/user/satus

func CheckAuthStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, isAuthenticated := handlers.CheckIfCookieValid(w, r)

	response := struct {
		IsLoggedIn bool `json:"isLoggedIn"`
		UserID     int  `json:"userId,omitempty"`
	}{
		IsLoggedIn: isAuthenticated,
		UserID:     userID,
	}

	json.NewEncoder(w).Encode(response)
}

func SetUserOfflineHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")

    if r.Method != http.MethodPost {
        w.WriteHeader(http.StatusMethodNotAllowed)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Method not allowed",
        })
        return
    }

    userID, isAuth := handlers.CheckIfCookieValid(w, r)
    if !isAuth {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Authentication required",
        })
        return
    }

    err := data.UpdateUserOnlineStatus(userID, false)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Failed to update online status",
        })
        return
    }

    json.NewEncoder(w).Encode(map[string]string{
        "status": "success",
        "message": "User set to offline",
    })
}