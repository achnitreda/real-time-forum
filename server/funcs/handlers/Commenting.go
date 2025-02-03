package forum

import (
	"database/sql"
	"encoding/json"
	data "forum/funcs/database"
	types "forum/funcs/types"
	"net/http"
	"strconv"
	"strings"
)

func Commenting(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		post_id, err := strconv.Atoi(r.URL.Query().Get("post_id"))
		if err != nil || post_id <= 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid post ID"})
			return
		}

		user_id := 0
		if Cookie, err := r.Cookie("Token"); err == nil {
			user_id, _ = data.GetUserIDFromToken(Cookie.Value)
		}

		opts := types.QueryOptions{
			UserID: user_id,
			PostID: strconv.Itoa(post_id),
		}

		query, args := data.BuildPostQuery(opts)

		posts, err := data.GetPosts(user_id, query, args...)
		if err == sql.ErrNoRows || len(posts) == 0 {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Post not found"})
			return
		}
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
			return
		}

		comments, err := data.GetComment(post_id, user_id, 3, 0)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch comments"})
			return
		}

		response := struct {
			Post     types.POST      `json:"post"`
			Comments []types.COMMENT `json:"comments"`
		}{
			Post:     posts[0],
			Comments: comments,
		}

		json.NewEncoder(w).Encode(response)
	case http.MethodPost:
		c, err := r.Cookie("Token")
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
			return
		}

		user_id, err := data.GetUserIDFromToken(c.Value)
		if err != nil {
			ClearSession(w)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session"})
			return
		}

		content := strings.TrimSpace(r.FormValue("Content"))
		if content == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Please enter a comment"})
			return
		}

		post_id, err := strconv.Atoi(r.FormValue("post_id"))
		if err != nil || post_id <= 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid post ID"})
			return
		}

		comment_id, err := data.InsertComment(post_id, user_id, content)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save comment"})
			return
		}

		var username string
		err = data.Db.QueryRow(`SELECT uname FROM users WHERE id = ?`, user_id).Scan(&username)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch user info"})
			return
		}

		response := struct {
			Id       int    `json:"id"`
			Uname    string `json:"uname"`
			Content  string `json:"content"`
			Likes    int    `json:"likes"`
			Dislikes int    `json:"dislikes"`
		}{
			Id:       comment_id,
			Uname:    username,
			Content:  content,
			Likes:    0,
			Dislikes: 0,
		}

		json.NewEncoder(w).Encode(response)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
	}
}
