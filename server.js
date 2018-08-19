const express = require("express");
const cookieParser = require('cookie-parser')
const multer = require("multer");
const path = require("path");

const crypto = require("crypto");
const bcrypt = require('bcrypt');

const app = express();
const upload = multer();
app.use(cookieParser());


function isExpired (date, limitMs) {
    return (date.valueOf() + limitMs) < (new Date().valueOf());
}

function getRemoteAddr(request) {
    let ip = request.headers["x-forwarded-for"]
        || request.connection.remoteAddress
        || request.socket.remoteAddress
        || request.connection.socket.remoteAddress;
    let remotePort = request.connection.remotePort;
    let remoteAddr = ip + ":" + remotePort;
    return remoteAddr;
}

function makeSessionId(...args) {
    return new Promise((resolve, reject) => {
        crypto.pseudoRandomBytes(64, function(err, raw) {
            let saltRounds = 10;
            let base64d = Buffer.from(raw).toString("base64");
            let string = base64d + args.join("");

            bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(string, salt, function(err, hash) {
                    if (err) reject(err);
                    resolve(hash);
                });
            });
        });
    });
}


function appAuth(auth, options) {
    let oneHourMs = (60 * 60 * 1000);
    let sessionStore = {};
    let html = `<html>
<head>
<link rel="stylesheet" href="style.css" type="text/css">
<script src="index.js" type="module"></script>
</head>
<body>
</body>
</html>`;
    return function (request, response, next) {
        if (!request.app.authMiddlewarePOST_setup) {

            request.app.post(request.path, upload.array(), async function (req, res) {
                let data = req.body;
                console.log("data", data);
                let { username, password } = data;
                if (auth(username, password)) {
                    let now = new Date();
                    let sessionId = await makeSessionId(now, getRemoteAddr(req));
                    sessionStore[sessionId] = {
                        lastTouch: now,
                        id: sessionId
                    };
                    res.cookie("sessionid", sessionId);
                    res.redirect(302, req,path);
                }
                else {
                    res.status(401).send(html);
                }
            });

            request.app.authMiddlewarePOST_setup = true;
        }

        // Do authenticated session detection
        let sessionId = request.cookies.sessionid;
        if (sessionId === undefined) {
            response.status(401).send(html);
            return;
        }

        let sessionObject = sessionStore[sessionId];
        if (sessionObject === undefined
            || isExpired(sessionObject.lastTouch, oneHourMs)) {
            response.status(401).send(html);
            return;
        }

        // Otherwise it's all ok.
        next();
    };
}

let authMiddleware = appAuth(function (username, password) {
    return true;
});

app.get("/", authMiddleware, function (req, res) {
    res.send("<html><h1>hi!</h1></html>");
});

app.get(new RegExp("(\/index.js|\/style.css)"), function (req, res) {
    res.sendFile(path.join(__dirname, req.params[0]));
});

app.listen(8005, function () {
    console.log("listening on 8005");
});

// End
