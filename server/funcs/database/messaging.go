package forum

import (
	"database/sql"
	"log"
	"time"
)

type Message struct {
	ID         int       `json:"id"`
	SenderID   int       `json:"sender_id"`
	ReceiverID int       `json:"receiver_id"`
	Content    string    `json:"content"`
	SentAt     time.Time `json:"sent_at"`
	SenderName string    `json:"sender_name"`
	IsRead     bool      `json:"is_read"`
}

type Conversation struct {
	UserID          int       `json:"user_id"`
	Username        string    `json:"username"`
	LastMessage     string    `json:"last_message"`
	LastMessageTime time.Time `json:"last_message_time"`
	UnreadCount     int       `json:"unread_count"`
	IsOnline        bool      `json:"is_online"`
}

func InsertMessage(senderID, receiverID int, content string) (int, error) {
	// 1- start transaction
	tx, err := Db.Begin()
	if err != nil {
		return 0, err
	}

	// 2- insert msg
	result, err := tx.Exec(`
	INSERT INTO private_messages (sender_id, receiver_id, content, sent_at) 
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
		senderID, receiverID, content)
	if err != nil {
		tx.Rollback() // Undo everything if error occurs
		return 0, err
	}

	// 3- get Msg Id
	messageID, err := result.LastInsertId()
	if err != nil {
		tx.Rollback()
		return 0, err
	}

	// 4 - Update Conversation
	_, err = tx.Exec(`
	INSERT INTO conversations (user1_id, user2_id, last_message_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
	ON CONFLICT (user1_id, user2_id)
	DO UPDATE SET last_message_at = CURRENT_TIMESTAMP
	`, senderID, receiverID)
	if err != nil {
		tx.Rollback()
		return 0, err
	}

	// 5- commit tx
	if err = tx.Commit(); err != nil {
		return 0, err
	}

	return int(messageID), nil
}

func GetMessages(userID, otherUserID, limit, offset int) ([]Message, error) {
	rows, err := Db.Query(`
    WITH messages_ordered AS (
        SELECT 
            pm.id,
            pm.sender_id,
            pm.receiver_id,
            pm.content,
            pm.sent_at,
            u.uname as sender_name,
            pm.is_read
        FROM private_messages pm
        JOIN users u ON pm.sender_id = u.id
        WHERE (pm.sender_id = ? AND pm.receiver_id = ?)
           OR (pm.sender_id = ? AND pm.receiver_id = ?)
        ORDER BY pm.sent_at DESC
        LIMIT ? OFFSET ?
    )
    SELECT * FROM messages_ordered ORDER BY sent_at ASC
    `, userID, otherUserID,
		otherUserID, userID,
		limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		err := rows.Scan(
			&msg.ID,
			&msg.SenderID,
			&msg.ReceiverID,
			&msg.Content,
			&msg.SentAt,
			&msg.SenderName,
			&msg.IsRead,
		)
		if err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	// Mark messages as read
	_, err = Db.Exec(`
		UPDATE private_messages 
		SET is_read = true 
		WHERE receiver_id = ? AND sender_id = ? AND is_read = false`,
		userID, otherUserID,
	)
	if err != nil {
		return nil, err
	}

	return messages, nil
}

// needs a review
func GetConversations(userID int) ([]Conversation, error) {
	rows, err := Db.Query(`
	WITH LastMessages AS (
		SELECT 
			CASE 
				WHEN sender_id = ? THEN receiver_id
				ELSE sender_id
			END as other_user_id,
			content as last_message,
			sent_at as last_message_time,
			ROW_NUMBER() OVER (
				PARTITION BY 
					CASE 
						WHEN sender_id = ? THEN receiver_id
						ELSE sender_id
					END 
				ORDER BY sent_at DESC
			) as rn
		FROM private_messages
		WHERE sender_id = ? OR receiver_id = ?
	)
	SELECT 
		u.id,
		u.uname,
		lm.last_message,
		lm.last_message_time,
		COALESCE(us.is_online, false) as is_online,
		(
			SELECT COUNT(*)
			FROM private_messages pm
			WHERE pm.sender_id = u.id 
			AND pm.receiver_id = ?
			AND pm.is_read = false
		) as unread_count
	FROM LastMessages lm
	JOIN users u ON u.id = lm.other_user_id
	LEFT JOIN user_sessions us ON us.user_id = u.id
	WHERE lm.rn = 1
	ORDER BY lm.last_message_time DESC, u.uname`,
		userID, userID, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conversations []Conversation
	for rows.Next() {
		var conv Conversation
		err := rows.Scan(
			&conv.UserID,
			&conv.Username,
			&conv.LastMessage,
			&conv.LastMessageTime,
			&conv.IsOnline,
			&conv.UnreadCount,
		)
		if err != nil {
			return nil, err
		}
		conversations = append(conversations, conv)
	}

	return conversations, nil
}

func GetNewUsers(userID int) ([]Conversation, error) {
	rows, err := Db.Query(`
	SELECT 
		u.id,
		u.uname,
		COALESCE(us.is_online, false) as is_online
	FROM users u
	LEFT JOIN user_sessions us ON us.user_id = u.id
	WHERE u.id != ? 
	AND u.id NOT IN (
		SELECT DISTINCT 
			CASE 
				WHEN sender_id = ? THEN receiver_id
				ELSE sender_id
			END
		FROM private_messages
		WHERE sender_id = ? OR receiver_id = ?
	)
	ORDER BY u.uname`,
		userID, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []Conversation
	for rows.Next() {
		var user Conversation
		err := rows.Scan(&user.UserID, &user.Username, &user.IsOnline)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

func UpdateUserOnlineStatus(userID int, isOnline bool) error {
	// First check if user exists in the table
	var existingUserID int
	err := Db.QueryRow("SELECT user_id FROM user_sessions WHERE user_id = ?", userID).Scan(&existingUserID)

	if err == sql.ErrNoRows {
		// User doesn't exist, do insert
		log.Printf("Inserting new user session for user_id: %d, online: %v", userID, isOnline)
		_, err = Db.Exec(`
            INSERT INTO user_sessions (user_id, is_online, last_seen)
            VALUES (?, ?, CURRENT_TIMESTAMP)`,
			userID, isOnline)
	} else if err == nil {
		// User exists, do update
		log.Printf("Updating existing user session for user_id: %d, online: %v", userID, isOnline)
		_, err = Db.Exec(`
            UPDATE user_sessions 
            SET is_online = ?, last_seen = CURRENT_TIMESTAMP
            WHERE user_id = ?`,
			isOnline, userID)
	}

	if err != nil {
		log.Printf("Error in UpdateUserOnlineStatus: %v", err)
	}

	return err
}
