# forum

## thought process:

```
- You will have only one HTML file, so every change of page you want to do, should be handled in the Javascript.
- This can be called having a single page application.

=> how to know if your app is MPA or SSR app ✅
=> how to switch your app from MPA or SSR to SPA ✅
```

```
- New Forum:  ✅
=> users need to login in order to see the posts and everything
=> not like the old forum that let's unregisted users see posts

- register part: ✅
=> need to have additional infos
Username-
Age
Gender
First Name-
Last Name-
E-mail-
Password-

- login part: ✅
=> The user must be able to connect using either the nickname or the e-mail combined with the password.

- logout part: ✅
=> The user must be able to log out from any page on the forum.

- posts and comments are like the old forum: ✅
```

```
- private messages : ✅
- when shutting server down database has a state on online user. ⛔
- xss ⛔
```

## Docs:

```
client/
│── index.html
│── app.js
│── app.css
│── pages/
│   │── Home.js
│   │── Login.js
│   │── Register.js
│   │── Posting.js
│   │── Comment.js
│   │── Error.js

│── components/
│   │── header.js
│── images/
    │── logo.png
|server/
    |__ main.go
    |
```

- DATABASE STRUCTURE:

```
https://claude.site/artifacts/f6ddf655-73fa-4709-b228-582ceaead3b5
```

- GetConversations function:

```
==> you're user_id = 5 (Alice)

0 -> private_messages table:
id | sender_id | receiver_id | content        | sent_at
1  | 5 (Alice) | 10 (Bob)   | "Hi Bob"      | 10:00
2  | 10 (Bob)  | 5 (Alice)  | "Hi Alice"    | 10:01
3  | 5 (Alice) | 10 (Bob)   | "How are you" | 10:02
4  | 5 (Alice) | 15 (Charlie)| "Hey Charlie" | 10:03

1 -> 'WITH LastMessages' creates a temporary table that:
LastMessages temporary result:
other_user_id | last_message   | last_message_time | rn
10 (Bob)      | "How are you" | 10:02            | 1  <- Most recent with Bob
10 (Bob)      | "Hi Alice"    | 10:01            | 2  
10 (Bob)      | "Hi Bob"      | 10:00            | 3
15 (Charlie)  | "Hey Charlie" | 10:03            | 1  <- Most recent with Charlie

2 - final result
UserID | Username | LastMessage   | LastMessageTime | IsOnline | UnreadCount
10     | Bob      | "How are you"| 10:02          | true     | 2
15     | Charlie  | "Hey Charlie"| 10:03          | false    | 0

```

- clean-up event listeners:

```
// Without cleanup
function initializePage() {
    const button = document.querySelector('.like-button');

    button.addEventListener('click', async () => {
        await fetch('/api/like');
        updateUI();
    });
}

// What happens:
// 1. User visits page - 1 listener added
// 2. Navigates away and back - 2nd listener added
// 3. Clicks like button once
// 4. Two API calls are made!
// 5. UI updates twice
// 6. Data gets corrupted
```

- stop event bubbling:

```
// Without stopPropagation
const registerLinkHandler = (e) => {
    e.preventDefault();
    // This navigation event is dispatched
    window.dispatchEvent(new CustomEvent('navigate', {
        detail: { path: '/register' }
    }));
};

// Event bubbles up to document handler which also tries to navigate
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) {
        // This would cause a second navigation attempt!
        navigateToPage(link.href);
    }
});

// With stopPropagation - only one navigation occurs
const registerLinkHandler = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Stops here, document handler never runs
    window.dispatchEvent(new CustomEvent('navigate', {
        detail: { path: '/register' }
    }));
};
```