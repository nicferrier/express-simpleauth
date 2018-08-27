const auth = require("./server.js");
const express = require("express");
const assert = require("assert");

const app = express();

const authMiddleware = auth.middleware(function (username, password) {
    let auth = (username == "nic" && password == "secret");
    if (auth) {
        return true;
    }
    return false;
})

app.get("/", authMiddleware, function (req, res) {
    res.send("<html><h1>hi!</h1></html>");
});

const nodeFetch = require("node-fetch");
const fetch = require('fetch-cookie/node-fetch')(nodeFetch); // SPECIAL!!
const FormData = require("form-data");

let listener = app.listen(0, async function () {
    try {
        let port = listener.address().port;
        console.log("listening on", port);

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
