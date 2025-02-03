package forum

import "net/http"

func StaticFileHandler(w http.ResponseWriter, r *http.Request) {
	static := http.StripPrefix("/client/", http.FileServer(http.Dir("client")))

	if r.URL.Path == "/client/" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	static.ServeHTTP(w, r)
}
