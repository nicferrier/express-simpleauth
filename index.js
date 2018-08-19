window.addEventListener("load", () => {
    let form = document.body
        .appendChild(document.createElement("div"))
        .appendChild(document.createElement("form"));

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
            let submit = new Event("submit");
            form.dispatchEvent(submit);
        }
    });

    form.addEventListener("submit", async submitEvt => {
        submitEvt.preventDefault();

        let fd = new FormData(form);
        console.log("fd", Array.from(fd.entries()));
        let response = await fetch(document.location, {
            method: "POST",
            body: fd
        });

        if (response.redirected == true) {
            location = location.href;
        }
    });
});
