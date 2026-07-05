const browseBtn = document.getElementById("browseBtn");
const resumeInput = document.getElementById("resumeInput");
const fileInfo = document.getElementById("fileInfo");
const uploadArea = document.getElementById("uploadArea");
const analyzeBtn = document.getElementById("analyzeBtn");

// Browse button
browseBtn.addEventListener("click", () => {
    resumeInput.click();
});

// File input
resumeInput.addEventListener("change", () => {
    if (resumeInput.files.length > 0) {
        displayFile(resumeInput.files[0]);
    }
});

// Prevent browser from opening the file
["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

// Highlight upload area
["dragenter", "dragover"].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.add("dragging");
    });
});

// Remove highlight
["dragleave", "drop"].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.remove("dragging");
    });
});

// Drop event
uploadArea.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];

    if (file) {
        displayFile(file);
    }
});

// Display selected file
function displayFile(file) {

    if (file.type !== "application/pdf") {
        alert("Please upload only PDF files.");
        return;
    }

    const size = (file.size / 1024).toFixed(2);

    fileInfo.innerHTML = `
        <p><strong>Selected File:</strong></p>
        <p>${file.name}</p>
        <p>${size} KB</p>
    `;
    analyzeBtn.disabled = false;
}

analyzeBtn.addEventListener("click", () => {
    window.location.href = "analysis.html";
});