// Express auth middleware
// Copyright (C) 2018 by Nic Ferrier

const cookieParser = require('cookie-parser')
const multer = require("multer");
const path = require("path");
const querystring = require("querystring");
const fs = require("./fsasync.js");

const crypto = require("crypto");
const bcrypt = require('bcryptjs');

const upload = multer();
const cookieMiddleware = cookieParser();

function readAuthJs() {
    return fs.promises.readFile(path.join(__dirname, "index.js"));
}

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
            let base64d = Buffer.from(raw).toString("base64");
            let string = base64d + args.join("");
            let saltRounds = 10;

            bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(string, salt, function(err, hash) {
                    if (err) reject(err);
                    resolve(hash);
                });
            });
        });
    });
}


exports.middleware = function(authFn, options) {
    let oneHourMs = (60 * 60 * 1000);
    let sessionStore = {};
    return async function (request, response, next) {
        // console.log("authMiddleware path", request.path);
        
        if (request.app.authMiddleware_setup == undefined) {
            let authJs = await readAuthJs();
            let reqPath = request.path;
            let authRoutePath = await new Promise((resolve, reject) => {
                crypto.pseudoRandomBytes(64, function(err, raw) {
                    if (err) return reject(err);
                    let base64d = Buffer.from(raw).toString("base64");
                    let slashify = reqPath[reqPath.length - 1] == "/" ? reqPath : reqPath + "/";
                    let string = slashify + querystring.escape(base64d);
                    resolve(string);
                });
            });

            request.app.post(
                authRoutePath,
                cookieMiddleware, upload.array(),
                async function (req, res) {
                    let data = req.body;
                    // console.log("data", data);
                    let { username, password } = data;
                    if (authFn(username, password)) {
                        let now = new Date();
                        let sessionId = await makeSessionId(now, getRemoteAddr(req));
                        sessionStore[sessionId] = {
                            lastTouch: now,
                            id: sessionId
                        };

                        // console.log("auth middleware setting cookie", req.path);

                        res.cookie("sessionid", sessionId);
                        res.redirect(302, req,path);
                    }
                    else {
                        res.status(401).send(html);
                    }
                });

            request.app.get(authRoutePath + "/index.js", function (req, res) {
                res.set("content-type", "application/javascript");
                res.send(`const middlewarePath = "${authRoutePath}";\n`
                        + authJs);
            });

            request.app.get(authRoutePath + "/style.css", function (req, res) {
                res.sendFile(path.join(__dirname, "style.css"));
            });

            // The setup variable is the HTML we need to use
            request.app.authMiddleware_setup = `<html>
<head>
<link rel="stylesheet" href="${authRoutePath}/style.css" type="text/css">
<script src="${authRoutePath}/index.js" type="module"></script>
</head>
<body>
</body>
</html>`;
        }

        cookieMiddleware(request, response, function () {
            /*
            console.log("auth - cookie middlewared path",
                        request.path,
                        request.cookies,
                        request.get("Cookie"));
            */
            // Do authenticated session detection
            let sessionId = request.cookies.sessionid;
            if (sessionId === undefined) {
                response.status(401).send(request.app.authMiddleware_setup);
                return;
            }
            
            let sessionObject = sessionStore[sessionId];
            if (sessionObject === undefined
                || isExpired(sessionObject.lastTouch, oneHourMs)) {
                response.status(401).send(request.app.authMiddleware_setup);
                return;
            }

            // Otherwise it's all ok.
            next();
        });
    };
};

// End
