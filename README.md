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
=> likes not working ⛔
```

```
- private messages : ⛔
Because it should be in the landing page I need at least to create it UI
=> implement it just like the other real-time-forum
```

```
- the new added feature in this project is private messages
- that we will use |websockets| in it
- send emojis to each other test it ??
- notif: A user must be able to see the notifications in every page of the project
```

```
client/
│── index.html
│── app.js
│── app.css
│── pages/
│   │── home/
│   │   │── index.js
│   │   │── home.html
│   │   │── home.css
│   │
│   │── login/
│   │   │── index.js
│   │   │── login.html
│   │   │── login.css
│   │
│   │── register/
│   │   │── index.js
│   │   │── register.html
│   │   │── register.css
│   │
│   │── posting/
│   │   │── index.js
│   │   │── posting.html
│   │   │── posting.css
│   │
│   │── comment/
│   │   │── index.js
│   │   │── comment.html
│   │   │── comment.css
│   │
│   │── error/
│       │── index.js
│       │── error.html
│       │── error.css
│
│── components/
│   │── header.js
│── api/
│── images/
    │── logo.png
|server/
    |__ main.go
    |
```

---

```
- Images handling:
supporting various types of extensions.
In this project you have to handle at least JPEG, PNG and GIF types.
You will have to store the images, it can be done by storing the file/path in the database
and saving the image in a specific file system.

-
```

## Docs:

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
