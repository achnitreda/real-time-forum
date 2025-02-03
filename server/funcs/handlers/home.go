package forum

import (
	"database/sql"
	"encoding/json"
	data "forum/funcs/database"
	types "forum/funcs/types"
	"net/http"
)

func Home(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	w.Header().Set("Content-Type", "application/json")

	userID := 0
	if c, err := r.Cookie("Token"); err == nil {
		userID, _ = data.GetUserIDFromToken(c.Value)
	}

	opts := types.QueryOptions{
		UserID: userID,
		Limit:  4,
		Offset: 0,
	}

	query, args := data.BuildPostQuery(opts)

	posts, err := data.GetPosts(userID, query, args...)
	if err != nil && err != sql.ErrNoRows {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch posts"})
		return
	}

	response := struct {
		Posts      []types.POST
		IsLoggedIn bool
		Categories []string
	}{
		Posts:      posts,
		IsLoggedIn: userID > 0,
		Categories: DefaultCategories,
	}

	if err = json.NewEncoder(w).Encode(response); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encode response"})
	}
}
