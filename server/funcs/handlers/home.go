package forum

import (
	"database/sql"
	"encoding/json"
	data "forum/funcs/database"
	types "forum/funcs/types"
	"net/http"
	"strconv"
)

func Home(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	// Get user ID from cookie if exists
	userID := 0
	if c, err := r.Cookie("Token"); err == nil {
		userID, _ = data.GetUserIDFromToken(c.Value)
	}

	// Get pagination parameters
	offset := 0
	limit := 4
	if offsetParam := r.URL.Query().Get("offset"); offsetParam != "" {
		if parsedOffset, err := strconv.Atoi(offsetParam); err == nil {
			offset = parsedOffset
		}
	}

	// Get filter type if exists
	filterType := r.URL.Query().Get("type")

	opts := types.QueryOptions{
		UserID: userID,
		Limit:  limit,
		Offset: offset,
		Filter: filterType,
	}

	query, args := data.BuildPostQuery(opts)
	posts, err := data.GetPosts(userID, query, args...)
	if err != nil && err != sql.ErrNoRows {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch posts"})
		return
	}

	// Only include categories in initial load (offset = 0)
	var categories []string
	if offset == 0 {
		categories = DefaultCategories
	}

	response := struct {
		Posts      []types.POST `json:"posts"`
		IsLoggedIn bool         `json:"isLoggedIn"`
		Categories []string     `json:"categories,omitempty"`
		HasMore    bool         `json:"hasMore"`
	}{
		Posts:      posts,
		IsLoggedIn: userID > 0,
		Categories: categories,
		HasMore:    len(posts) == limit,
	}

	if err = json.NewEncoder(w).Encode(response); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encode response"})
	}
}
