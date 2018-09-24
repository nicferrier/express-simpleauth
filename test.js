// -*- js-indent-level: 4 -*-
const auth = require("./server.js");
const path = require("path");
const express = require("express");
const assert = require("assert");
const Browser = require("zombie");

const app = express();

function trygo (promiseThing) {
    return promiseThing.then(v => [undefined, v]);
}

// Plain old middleware

const authMiddleware1 = auth.middleware(function (username, password) {
    let auth = (username == "nic" && password == "secret");
    if (auth) {
        return true;
    }
    return false;
});

app.get("/", authMiddleware1, function (req, res) {
    res.send("<html><h1>hi!</h1></html>");
});


// A middleware with extra script

const authMiddleware2 = auth.middleware(function (username, password) {
    let auth = (username == "nic" && password == "secret");
    if (auth) {
        return true;
    }
    return false;
}, { name: "two", extraAuthJsUrl: "extra.js" });

app.get("/extra.js", function (req, res) {
    res.sendFile(path.join(__dirname, "/test-extra.js"));
});

app.get("/extra", authMiddleware2, function (req, res) {
    res.send("<html><h1>hi!</h1></html>");
});


const nodeFetch = require("node-fetch");
const fetch = require('fetch-cookie/node-fetch')(nodeFetch); // SPECIAL!!
const FormData = require("form-data");

let listener = app.listen(0, async function () {
    try {
        let port = listener.address().port;
        console.log("listening on", port);

        /* Basic fetch to check for inserted js file */
        let get = await fetch(`http://localhost:${port}`);
        let body = await get.text(); // it's html

        let src = new RegExp("src=\"([^\"]+)/index.js\"").exec(body);
        if (src == undefined) {
            throw new assert.AssertionError({
                message: "no page source in html",
                actual: body
            });
        }
        let [_, url] = src;

        /* Basic working case */
        {
            let form = new FormData();
            form.append("username", "nic");
            form.append("password", "secret");

            let response = await fetch(`http://localhost:${port}${url}`, {
                method: "POST",
                body: form
            });
            assert.deepStrictEqual(response.status, 200);
        }

        /* Now the bad password case */
        {
            let form = new FormData();
            form.append("username", "nic");
            form.append("password", "sec");

            let response = await fetch(`http://localhost:${port}${url}`, {
                method: "POST",
                body: form
            });
            assert.deepStrictEqual(response.status, 401);
        }

        /* Browser case */
        {
            // FIXME - we want to test stuff like the script executing
            // the js but zombie can't handle the 401 yet;
            //
            // Maybe that's a sign that the HTTP semantic thing STILL
            // doesn't work
            Browser.localhost("mysite.com", port);
            let browser = new Browser();

            let [err, visit] = await trygo(browser.visit("/")).catch(e => [e]);
            if (err && err.message.startsWith("Server returned status code 401")) {
                //console.log("auth failed!");
            }
            let [username, password] = browser.querySelectorAll("input");
            assert.deepStrictEqual(username.getAttribute("name"), "username");
            assert.deepStrictEqual(password.getAttribute("name"), "password");

            // This one might be different?
            let [err2, visit2] = await trygo(browser.visit("/extra")).catch(e => [e]);
            if (err2 && err2.message.startsWith("Server returned status code 401")) {
                //console.log("auth failed!");
            }
            let button = browser.querySelector("button");
            assert.deepStrictEqual(button.textContent, "click me");
        }
    }
    catch (e) {
        console.log("test failed", e);
        process.exit(1);
    }
    finally {
        process.exit(0);
    }
});

// End
