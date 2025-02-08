package forum

import (
	"encoding/json"
	Data "forum/funcs/database"
	"net/http"
)

func ClearSession(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:   "Token",
		MaxAge: -1,
	})
}

func Auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if _, isAuth := CheckIfCookieValid(w, r); isAuth {
			next(w, r)
		} else {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error":    "Authentication required",
				"redirect": "/login",
			})
		}
	}
}

func AuthLG(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if _, isAuth := CheckIfCookieValid(w, r); isAuth {
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{
				"error":    "Already authenticated",
				"redirect": "/",
			})
		} else {
			next(w, r)
		}
	}
}

func CheckIfCookieValid(w http.ResponseWriter, r *http.Request) (int, bool) {
	var userId int
	c, err := r.Cookie("Token")
	if err == nil {
		userId, err = Data.GetUserIDFromToken(c.Value)
		if err != nil {
			http.SetCookie(w, &http.Cookie{
				Name:   "Token",
				MaxAge: -1,
			})
			return userId, false
		} else {
			return userId, true
		}
	}
	return userId, false
}
