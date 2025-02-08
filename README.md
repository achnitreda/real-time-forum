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
- private messages : ⛔
Because it should be in the landing page I need at least to create it UI
=> implement it just like the other real-time-forum
```

```
- the new added feature in this project is private messages
- that we will use |websockets| in it
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
