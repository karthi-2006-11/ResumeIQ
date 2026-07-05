const uploadAgainBtn = document.getElementById("uploadAgainBtn");

uploadAgainBtn.addEventListener("click", function () {
    window.location.href = "upload.html";
});

// Animate progress bars
window.addEventListener("load", function () {

    document.querySelector(".quality").style.width = "88%";

    document.querySelector(".skills").style.width = "75%";

    document.querySelector(".formatting").style.width = "92%";

});