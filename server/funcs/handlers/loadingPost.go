package forum

import (
	"database/sql"
	"encoding/json"

	data "forum/funcs/database"
	types "forum/funcs/types"
	"net/http"
	"strconv"
)

func LoadMorePosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Method not allowed",
		})
		return
	}
	offsetValue := r.FormValue("offset")
	filterType := r.FormValue("type")

	offset, err := strconv.Atoi(offsetValue)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Bad request",
		})
		return
	}

	user, err := r.Cookie("Token")

	var user_id int
	if err == nil {
		user_id, _ = data.GetUserIDFromToken(user.Value)
	}

	opts := types.QueryOptions{
		UserID: user_id,
		Limit:  4,
		Offset: offset,
		Filter: filterType,
	}

	query, args := data.BuildPostQuery(opts)

	posts, err := data.GetPosts(user_id, query, args...)
	if err != nil && err != sql.ErrNoRows {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Internal Server Error",
		})
		return
	}

	err = json.NewEncoder(w).Encode(posts)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Internal Server Error",
		})
	}
}
