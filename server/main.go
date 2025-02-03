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

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "client/index.html")
	})

	// http.HandleFunc("/", handlers.Home)

	// http.HandleFunc("/Posting", handlers.Auth(handlers.Posting))
	// http.HandleFunc("/load-more-posts", handlers.LoadMorePosts)

	// http.HandleFunc("/Commenting", handlers.Commenting)
	// http.HandleFunc("/load-more-comments", handlers.LoadMoreComments)

	// http.HandleFunc("/like-dislike", handlers.HandleLikeDislike)
	// http.HandleFunc("/filter", handlers.FilterHandler)

	fmt.Println("http://localhost:8080/")
	http.ListenAndServe(":8080", nil)
}
