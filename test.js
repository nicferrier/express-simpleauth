const auth = require("./server.js");
const express = require("express");
const app = express();

const authMiddleware = auth.middleware(function (username, password) {
    return true;
})

app.get("/", authMiddleware, function (req, res) {
    res.send("<html><h1>hi!</h1></html>");
});


app.listen(8005, function () {
    console.log("listening on 8005");
});
