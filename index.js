// -*- js-indent-level: 4 -*-

window.addEventListener("load", () => {
    if (window.authMiddlewarePath == undefined) {
        return new Error("no middleware path defined");
    }
    let middlewarePath = window.authMiddlewarePath;

    let loc = document.location;
    let netloc = loc.protocol + "//" + loc.host;
    let netport = netloc + ((loc.port == "") ? "" : ":" + loc.port);
    let url = netloc + middlewarePath;
    // console.log("fetch url", url);

    let form = document.body
        .appendChild(document.createElement("div"))
        .appendChild(document.createElement("form"));

    // Firefox won't seem to work without these
    form.setAttribute("action", url);
    form.setAttribute("method", "POST");

    let username = form.appendChild(document.createElement("input"));
    username.setAttribute("type", "text");
    username.setAttribute("name", "username");
    username.setAttribute("placeholder", "username");

    let password = form.appendChild(document.createElement("input"));
    password.setAttribute("type", "password");
    password.setAttribute("placeholder", "password");
    password.setAttribute("name", "password");

    form.addEventListener("keypress", keyEvt => {
        if (keyEvt.key == "Enter") {
            try {
                let submit = new Event("submit");
                form.dispatchEvent(submit);
                keyEvt.preventDefault();
                keyEvt.stopPropagation();
            }
            catch (e) {
                form.submit();
            }
        }
    });

    form.addEventListener("submit", submitEvt => {
        submitEvt.preventDefault();
        submitEvt.stopPropagation();

        let fd = new FormData(form);
        // console.log("fd", JSON.stringify(Array.from(fd.entries()), null, 2));

        let promise = fetch(url, {
            method: "POST",
            body: fd,
            credentials: "same-origin"
        });

        promise.then(response => {
            if (response.redirected) {
                location = location.href;
            }
        }).catch(err => console.log("simple-auth-4-express js error:", err));
        
        return false;
    });
});
