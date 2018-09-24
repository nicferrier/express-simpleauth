// client side extra js -*- js-indent-level: 4 -*-

window.addEventListener("load", loadEvt => {
    let button = document.createElement("button");
    button.textContent = "click me";
    let input = document.querySelectorAll("input")[1];
    input.after(button);
});
