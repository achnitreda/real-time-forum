package forum

import (
	"encoding/json"
	"net/http"
)

func Logout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:   "Token",
		MaxAge: -1,
	})

	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
	})
}
