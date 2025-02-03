package forum

import (
	"database/sql"
	"encoding/json"

	"net/http"
	"strings"
	"time"

	data "forum/funcs/database"

	"golang.org/x/crypto/bcrypt"
)

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Set JSON content type
	w.Header().Set("Content-Type", "application/json")

	identifier := strings.ToLower(strings.TrimSpace(r.FormValue("email")))
	password := r.FormValue("password")

	if identifier == "" || password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Please fill in all fields",
		})
		return
	}

	user, err := data.GetUserInfoByLoginInfo(identifier)
	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Invalid credentials",
			})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid credentials",
		})
		return
	}

	uuidStr, err := data.GenereteTocken()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = data.SetToken(uuidStr, user.ID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Set cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "Token",
		Value:    uuidStr,
		Expires:  time.Now().Add(1 * time.Hour),
		HttpOnly: true,
	})

	// Return success response
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
	})
}
