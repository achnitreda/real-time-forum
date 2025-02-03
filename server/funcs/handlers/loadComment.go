package forum

import (
	"encoding/json"
	data "forum/funcs/database"
	"net/http"
	"strconv"
)

func LoadMoreComments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Method not allowed",
		})
		return
	}

	offsetValue := r.FormValue("offset")

	offset, err := strconv.Atoi(offsetValue)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Bad request",
		})
		return
	}

	post_id, err := strconv.Atoi(r.FormValue("post_id"))
	if err != nil || post_id <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Bad request",
		})
		return
	}

	user_id := 0
	if Cookie, err := r.Cookie("Token"); err == nil {
		user_id, _ = data.GetUserIDFromToken(Cookie.Value)
	}

	comments, err := data.GetComment(post_id, user_id, 3, offset)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Internal Server Error",
		})
		return
	}

	err = json.NewEncoder(w).Encode(comments)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Internal Server Error",
		})
		return
	}
}
