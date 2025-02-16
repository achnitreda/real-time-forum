package forum

import (
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
)

var (
	Db            *sql.DB
	AllCategories = map[string]bool{
		"general":       true,
		"news":          true,
		"entertainment": true,
		"hobbies":       true,
		"lifestyle":     true,
		"technology":    true,
	}
)

const (
	usersTables = `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        uname TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `
	tokensTables = `
    CREATE TABLE IF NOT EXISTS tokens (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE,
        created_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `
	postsTable = `
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        img TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `
	categoriesTable = `
    CREATE TABLE IF NOT EXISTS post_categories (
        post_id INTEGER NOT NULL,
       	category VARCHAR(255) NOT NULL,
        PRIMARY KEY (post_id,category),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
    `
	commentsTable = `
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `

	postInteractionsTable = `
    CREATE TABLE IF NOT EXISTS post_interactions (
        user_id INTEGER,
        post_id INTEGER,
        interaction INTEGER,
        PRIMARY KEY (user_id, post_id), 
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`

	commentInteractionsTable = `
    CREATE TABLE IF NOT EXISTS comment_interactions (
        user_id INTEGER,
        comment_id INTEGER,
        interaction INTEGER,
        PRIMARY KEY (user_id, comment_id), 
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`

	userSessionsTable = `
    CREATE TABLE IF NOT EXISTS user_sessions (
        user_id INTEGER PRIMARY KEY,
        is_online BOOLEAN DEFAULT false,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`

	privateMessagesTable = `
    CREATE TABLE IF NOT EXISTS private_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT false,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );`

	conversationsTable = `
    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user1_id INTEGER NOT NULL,
        user2_id INTEGER NOT NULL,
        last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user1_id, user2_id),
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
    );`
)

func CreateDB() error {
	var err error
	Db, err = sql.Open("sqlite3", "./database.db")
	if err != nil {
		return err
	}

	// Enable foreign key constraints
	if _, err = Db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return err
	}

	tables := []struct {
		name   string
		schema string
	}{
		{"users", usersTables},
		{"tokens", tokensTables},
		{"posts", postsTable},
		{"post_categories", categoriesTable},
		{"comments", commentsTable},
		{"post_interactions", postInteractionsTable},
		{"comment_interactions", commentInteractionsTable},
		{"user_sessions", userSessionsTable},
		{"private_messages", privateMessagesTable},
		{"conversations", conversationsTable},
	}

	for _, table := range tables {
		if _, err := Db.Exec(table.schema); err != nil {
			return fmt.Errorf("failed to create %s table: %v", table.name, err)
		}
	}

	return nil
}
