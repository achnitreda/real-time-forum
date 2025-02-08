package forum

import (
	"encoding/json"
	data "forum/funcs/database"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type PostingData struct {
	Categories []string
	Error      string
}

var DefaultCategories = []string{"General", "News", "Entertainment", "Hobbies", "Lifestyle", "Technology"}

func Posting(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		json.NewEncoder(w).Encode(map[string]interface{}{
			"categories": DefaultCategories,
		})
	case http.MethodPost:
		var err error
		c, _ := r.Cookie("Token")
		id, _ := data.GetUserIDFromToken(c.Value)

		title := strings.TrimSpace(r.FormValue("title"))
		content := strings.TrimSpace(r.FormValue("content"))
		category := r.Form["categories"]

		// Get image file
		var name string
		imageExists := false

		file, header, err := r.FormFile("file")
		if err == nil {
			imageExists = true
			defer file.Close()

			// Check file extension
			ext := strings.ToLower(filepath.Ext(header.Filename))
			validExtensions := map[string]bool{
				".jpg":  true,
				".jpeg": true,
				".png":  true,
				".gif":  true,
			}

			if !validExtensions[ext] {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{
					"error": "Invalid file type. Only .jpg, .jpeg, .png, and .gif files are allowed",
				})
				return
			}

			name, err = data.GenereteTocken()
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process image"})
				return
			}

			extensions := strings.Split(header.Filename, ".")[1]
			name = name + "." + extensions

			if err = saveImg(file, "./images/"+name); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save image"})
				return
			}
		}

		if title == "" || (content == "" && !imageExists) || len(category) == 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "All fields are required. Please fill them",
			})
			return
		}

		if !CategoryFilter(category) {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Invalid category selected",
			})
			return
		}

		err = data.InsertPost(id, title, content, category, name)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Failed to create post",
			})
			return
		}

		json.NewEncoder(w).Encode(map[string]string{
			"status":  "success",
			"message": "Post created successfully",
		})
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
	}
}

func saveImg(file multipart.File, path string) error {
	outFile, err := os.Create(path)
	if err != nil {
		return err
	}
	defer outFile.Close()

	_, err = file.Seek(0, 0)
	if err != nil {
		return err
	}

	_, err = io.Copy(outFile, file)
	if err != nil {
		return err
	}

	return nil
}

func CategoryFilter(categories []string) bool {
	for _, v := range categories {
		if !data.AllCategories[strings.ToLower(v)] {
			return false
		}
	}
	return true
}
