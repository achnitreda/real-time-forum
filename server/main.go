package main

import (
	"fmt"
	forum "forum/funcs"
	data "forum/funcs/database"
	handlers "forum/funcs/handlers"
	"net/http"
	"strings"
)

func main() {
	err := data.CreateDB()
	if err != nil {
		fmt.Println(err)
		return
	}

	// auth
	http.HandleFunc("/api/login", handlers.AuthLG(handlers.Login))
	http.HandleFunc("/api/register", handlers.AuthLG(handlers.Register))
	http.HandleFunc("/api/logout", handlers.Auth(handlers.Logout))

	// static files
	http.HandleFunc("/client/", forum.StaticFileHandler)

	http.HandleFunc("/api/home", handlers.Home)
	http.HandleFunc("/api/filter", handlers.FilterHandler)
	http.HandleFunc("/api/like-dislike", handlers.HandleLikeDislike)

	http.HandleFunc("/api/comment", handlers.Commenting)
	http.HandleFunc("/api/comment/more", handlers.LoadMoreComments)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "../client/index.html")
	})

	// http.HandleFunc("/Posting", handlers.Auth(handlers.Posting))

	fmt.Println("http://localhost:8081/")
	http.ListenAndServe(":8081", nil)
}
