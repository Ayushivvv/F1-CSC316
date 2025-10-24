document.addEventListener("DOMContentLoaded", function () {
    const yearSelect = document.getElementById("yearSelect");
    const circuitSelect = document.getElementById("circuitSelect");

    // API hasn't been called yet, placeholder data
    const sampleYears = [2022, 2023, 2024];
    const sampleCircuits = ["Bahrain", "Monaco", "Silverstone", "Suzuka"];

    sampleYears.forEach(y => {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    });

    sampleCircuits.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        circuitSelect.appendChild(opt);
    });

    yearSelect.addEventListener("change", () => {
        console.log("Year selected:", yearSelect.value);
    });

    circuitSelect.addEventListener("change", () => {
        console.log("Circuit selected:", circuitSelect.value);
    });
});
