package forum

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	data "forum/funcs/database"

	"golang.org/x/crypto/bcrypt"
)

func Register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Create a struct to match the incoming JSON
	var userData struct {
		Email     string `json:"email"`
		Username  string `json:"username"`
		Password  string `json:"password"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Age       int    `json:"age"`
		Gender    string `json:"gender"`
	}

	// Decode JSON from request body
	if err := json.NewDecoder(r.Body).Decode(&userData); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
		return
	}

	// Convert values and validate
	email := strings.ToLower(strings.TrimSpace(userData.Email))
	uname := strings.ToLower(strings.TrimSpace(userData.Username))
	password := userData.Password
	firstName := userData.FirstName
	lastName := userData.LastName
	age := strconv.Itoa(userData.Age)
	gender := userData.Gender

	if err := RegisterValidation(email, uname, password, firstName, lastName, age, gender); err != "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
		return
	}

	// Insert user into database
	userId, err := data.InsertUserInfo(
		email,
		string(hashedPassword),
		uname,
		firstName,
		lastName,
		age,
		gender,
	)
	if err != nil {
		errMsg := err.Error()
		switch {
		case strings.Contains(errMsg, "UNIQUE constraint failed: users.uname"):
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "This username is already taken. Please choose a different one.",
			})
			return
		case strings.Contains(errMsg, "UNIQUE constraint failed: users.email"):
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "This email address is already registered. Please use a different email.",
			})
			return
		default:
			log.Printf("Database error during registration: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
			return
		}
	}

	newUserNotification := WebSocketMessage{
		Type: "new_user",
		Payload: map[string]interface{}{
			"user_id":   userId, // normaly I didn't work with it the payload because I loadConversations and I don't simply add it
			"username":  userData.Username,
			"is_online": true,
		},
	}

	wsManager.broadcastToAll(newUserNotification, userId)

	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Registration successful",
	})
}

func RegisterValidation(email, uname, password, firstName, lastName, age, gender string) string {
	// Email validation
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9.]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if email == "" || !emailRegex.MatchString(email) {
		return "Please enter a valid email address"
	}

	// Username validation
	if len(uname) < 3 || len(uname) > 30 {
		return "Username must be between 3 and 30 characters"
	}

	// Password validation
	if len(password) < 8 {
		return "Password must be at least 8 characters long"
	}

	// First Name validation
	firstName = strings.TrimSpace(firstName)
	if len(firstName) < 2 || len(firstName) > 50 {
		return "First name must be between 2 and 50 characters"
	}
	nameRegex := regexp.MustCompile(`^[a-zA-Z\s-]+$`)
	if !nameRegex.MatchString(firstName) {
		return "First name can only contain letters, spaces, and hyphens"
	}

	// Last Name validation
	lastName = strings.TrimSpace(lastName)
	if len(lastName) < 2 || len(lastName) > 50 {
		return "Last name must be between 2 and 50 characters"
	}
	if !nameRegex.MatchString(lastName) {
		return "Last name can only contain letters, spaces, and hyphens"
	}

	// Age validation
	ageNum, err := strconv.Atoi(age)
	if err != nil || ageNum < 13 || ageNum > 120 {
		return "Age must be between 13 and 120"
	}

	// Gender validation
	validGenders := map[string]bool{
		"male":           true,
		"female":         true,
		"prefer-not-say": true,
	}
	if !validGenders[gender] {
		return "Please select a valid gender option"
	}

	return ""
}
