# Simple Authentication Middleware for Express

This is a very simple basic-authentication middleware for Express.

Install it:

```
npm install simple-auth-4-express
```

Use it like this:

```javascript
const auth = require("simple-auth-4-express");
const express = require("express");
const app = express();

const authMiddleware = auth.middleware(function (username, password) {
    let users = { "nic": "secret" };
    return users[username] == password;
})

app.get("/", authMiddleware, function (req, res) {
    res.send("<html><h1>hi!</h1></html>");
});


app.listen(8005, function () {
    console.log("listening on 8005");
});

```

## What does it do?

It uses cookies to store a session identifier for an authenticated session.

When no authenticated session cookie exists OR the authenticated
session cookie is older than one hour, it returns an HTTP 401 with a
generated HTML page.

The generated HTML page has JS that accepts a username and password
and AJAX POSTs the result back to the middleware.

The POST accepts the username and password and tests it against a
function that you supply.

If the function returns true then the session cookie is created and a
redirect is sent back to the AJAXing JS.

The AJAXing JS then redirects to the current location.

If authentication has been sucessfull then the redirected GET will be
authenticated.


## How does it work?

It works by inserting handlers for the POST and the assets it needs
(mainly the AJAXing JS).

This seems like a bit of a dodgy tactic. But it does work.
