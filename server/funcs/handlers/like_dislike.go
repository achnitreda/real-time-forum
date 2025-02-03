package forum

import (
	"encoding/json"
	data "forum/funcs/database"
	"net/http"
)

func HandleLikeDislike(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Method not allowed",
		})
		return
	}

	user_id, ok := CheckIfCookieValid(w, r)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	action := r.FormValue("action")
	types := r.FormValue("type")
	commentid := r.FormValue("commentid")

	if (types != "post" && types != "comment") || (action != "dislike" && action != "like") {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid action or type",
		})
		return
	}

	err := data.AddInteractions(user_id, commentid, action, types)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to update interaction",
		})
		return
	}
}
