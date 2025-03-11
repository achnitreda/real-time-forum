package forum

import (
	"fmt"
	"strconv"
)

func InsertUserInfo(email, password, uname, firstName, lastName, age, gender string) (int, error) {
	selector := `INSERT INTO users(
        password,
        uname,
        email,
        first_name,
        last_name,
        age,
        gender
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`

	// Convert age string to integer
	ageNum, err := strconv.Atoi(age)
	if err != nil {
		return 0, fmt.Errorf("invalid age format: %v", err)
	}

	result, err := Db.Exec(selector,
		password,
		uname,
		email,
		firstName,
		lastName,
		ageNum,
		gender,
	)
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	// Create token entry
	selector = `INSERT INTO tokens(user_id) VALUES (?)`
	_, err = Db.Exec(selector, int(id))
	if err != nil {
		return 0, err
	}

	return int(id), nil
}
