package forum

import (
	"database/sql"
	"encoding/json"
	data "forum/funcs/database"
	types "forum/funcs/types"
	"log"
	"net/http"
	"strings"
)

func FilterHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	filter := strings.ToLower(r.URL.Query().Get("type"))

	if filter != "" && !data.AllCategories[strings.ToLower(filter)] &&
		filter != "created" && filter != "liked" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid filter type",
		})
		return
	}

	userID := 0
	if cookie, err := r.Cookie("Token"); err == nil {
		userID, _ = data.GetUserIDFromToken(cookie.Value)
	}

	if (filter == "created" || filter == "liked") && userID == 0 {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Authentication required for this filter",
		})
		return
	}

	opts := types.QueryOptions{
		UserID: userID,
		Filter: filter,
	}

	query, args := data.BuildPostQuery(opts)
	posts, err := data.GetPosts(userID, query, args...)
	if err != nil && err != sql.ErrNoRows {
		log.Println("Error getting posts:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to fetch posts",
		})
		return
	}

	response := struct {
		Posts      []types.POST
		IsLoggedIn bool
	}{
		Posts:      posts,
		IsLoggedIn: userID > 0,
	}

	err = json.NewEncoder(w).Encode(response)
	if err != nil {
		log.Println("Error encoding response:", err)
		w.WriteHeader(http.StatusInternalServerError)
	}
}
