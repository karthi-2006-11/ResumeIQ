const progress = document.getElementById("progressFill");
const statusText = document.getElementById("statusText");

let value = 0;

const steps = [
    "Reading Resume...",
    "Extracting Skills...",
    "Checking ATS Compatibility...",
    "Generating Suggestions...",
    "Preparing Report..."
];

let currentStep = 0;

const timer = setInterval(() => {

    value += 20;

    progress.style.width = value + "%";

    statusText.textContent = steps[currentStep];

    currentStep++;

    if(value >= 100){

        clearInterval(timer);

        setTimeout(() => {

            window.location.href="analysis.html";

        },600);

    }

},800);