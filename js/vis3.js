// === viz3.js ===
let viz3HasRun = false;

console.log("viz3.js loaded");

document.addEventListener("DOMContentLoaded", function () {
    console.log("DOMContentLoaded fired");
    
    // Check if D3 is loaded
    if (typeof d3 === 'undefined') {
        console.error("D3.js is not loaded!");
        return;
    }
    console.log("D3.js is loaded");
    
    // Check if container exists
    const container = document.getElementById("viz3-main");
    if (!container) {
        console.error("#viz3-main element not found!");
        return;
    }
    console.log("#viz3-main found");
    
    if (viz3HasRun) {
        console.warn("viz3 already executed, blocking duplicate call");
        return;
    }
    viz3HasRun = true;
    console.log("Starting viz3()...");
    
    try {
        viz3();
    } catch (error) {
        console.error("Error in viz3():", error);
    }
});

// Global abort controller for cleanup
let viz3AbortController = null;

function viz3() {
    console.log("viz3() function started");
    
    // Abort all previous event listeners
    if (viz3AbortController) {
        console.log("Aborting previous controller");
        viz3AbortController.abort();
    }
    
    // Create new abort controller
    viz3AbortController = new AbortController();
    const signal = viz3AbortController.signal;
    console.log("New AbortController created");

    const weather_csv = "data/f1_weather_2018_2023.csv";
    console.log("Loading CSV from:", weather_csv);
    const weather_container = d3.select("#viz3-main");

    const weatherOptions = ["hot", "cold", "rain", "windy"];
    const weatherLabels = {
        hot: "Hot Temperature",
        cold: "Cold Temperature",
        rain: "Rainfall",
        windy: "Windy"
    };

    // --- Safe slider injection ---
    (function safeSliderInjection() {
        const selectEl = document.getElementById("weather-select");
        if (!selectEl) return;

        // Remove existing slider if present
        const existingWrapper = document.querySelector(".weather-slider-wrapper");
        if (existingWrapper) {
            existingWrapper.remove();
        }

        const wrapper = document.createElement("div");
        wrapper.className = "weather-slider-wrapper";
        wrapper.style.width = "100%";
        wrapper.style.maxWidth = "300px";

        const label = document.createElement("label");
        label.setAttribute("for", "weather-slider");
        label.innerHTML = `Weather: <span id="weather-current">Hot</span>`;
        wrapper.appendChild(label);

        const slider = document.createElement("input");
        slider.id = "weather-slider";
        slider.type = "range";
        slider.min = "0";
        slider.max = "3";
        slider.step = "1";
        slider.value = "0";
        slider.style.width = "100%";
        wrapper.appendChild(slider);

        const ticks = document.createElement("div");
        ticks.className = "slider-ticks";
        ticks.style.display = "flex";
        ticks.style.justifyContent = "space-between";
        ticks.style.fontSize = "clamp(10px, 2vw, 14px)";
        ticks.innerHTML = `<span>Hot</span><span>Cold</span><span>Rain</span><span>Windy</span>`;
        wrapper.appendChild(ticks);

        selectEl.parentNode.insertBefore(wrapper, selectEl);
        selectEl.style.display = "none";
    })();

    // --- Load CSV and initialize chart ---
    weather_cleanData(weather_csv)
        .then(weather_dataset => {
            console.log("Dataset loaded successfully, size:", weather_dataset.length);
            
            // Check if aborted
            if (signal.aborted) return;

            weather_container.select(".awaitingText").remove();

        // Remove existing SVG if present
        weather_container.select("#weather-svg").remove();

        const weather_svgHost = weather_container
            .append("svg")
            .attr("id", "weather-svg")
            .attr("width", "100%")
            .style("display", "block");

        let currentFactor = "hot";

        function getResponsiveDimensions() {
            const containerWidth = weather_container.node().getBoundingClientRect().width;
            const width = Math.max(350, containerWidth);
            const height = Math.max(400, width * 0.6);

            const baseMargin = Math.min(width, 900) / 900;
            const margin = {
                top: Math.max(30, 50 * baseMargin),
                right: Math.max(20, 30 * baseMargin),
                bottom: Math.max(60, 80 * baseMargin),
                left: Math.max(50, 70 * baseMargin)
            };

            return { width, height, margin };
        }

        function updateWeatherChart(factor) {
            console.log("updateWeatherChart called with:", factor);
            if (signal.aborted) return;
            
            currentFactor = factor;
            const { width, height, margin } = getResponsiveDimensions();

            weather_svgHost.attr("viewBox", `0 0 ${width} ${height}`);
            weather_svgHost.selectAll("*").remove();

            let subset = [];
            let xScale, yScale, xLabel, yLabel;

            if (factor === "hot") {
                subset = weather_dataset.filter(d => d.trackTemp >= 35);
                console.log("Hot subset size:", subset.length);
                xScale = d3.scaleLinear().domain(d3.extent(subset, d => d.trackTemp)).range([margin.left, width - margin.right]);
                xLabel = "Track Temperature (°C)";
            } else if (factor === "cold") {
                subset = weather_dataset.filter(d => d.airTemp <= 15);
                console.log("Cold subset size:", subset.length);
                xScale = d3.scaleLinear().domain(d3.extent(subset, d => d.airTemp)).range([margin.left, width - margin.right]);
                xLabel = "Air Temperature (°C)";
            } else if (factor === "rain") {
                subset = weather_dataset.filter(d => d.rainfall > 0);
                console.log("Rain subset size:", subset.length);
                xScale = d3.scaleLinear().domain(d3.extent(subset, d => d.rainfall)).range([margin.left, width - margin.right]);
                xLabel = "Rainfall (mm)";
            } else if (factor === "windy") {
                subset = weather_dataset.filter(d => d.windSpeed >= 25);
                console.log("Windy subset size:", subset.length);
                xScale = d3.scaleLinear().domain(d3.extent(subset, d => d.windSpeed)).range([margin.left, width - margin.right]);
                xLabel = "Wind Speed (km/h)";
            }

            console.log("About to create scales and render...");

            yScale = d3.scaleLinear()
                .domain(d3.extent(subset, d => d.performance))
                .nice()
                .range([height - margin.bottom, margin.top]);
            yLabel = "Performance Metric";

            if (subset.length === 0) {
                weather_svgHost.append("text")
                    .attr("x", width / 2)
                    .attr("y", height / 2)
                    .attr("text-anchor", "middle")
                    .style("font-size", `${Math.max(12, width / 50)}px`)
                    .text("No races recorded for this condition.");
                return;
            }

            const axisFontSize = Math.max(10, width / 60);
            const labelFontSize = Math.max(12, width / 50);
            const titleFontSize = Math.max(14, width / 45);

            // X Axis
            const xAxis = weather_svgHost.append("g")
                .attr("transform", `translate(0,${height - margin.bottom})`)
                .call(d3.axisBottom(xScale).ticks(Math.max(3, width / 150)));
            xAxis.selectAll("text").style("font-size", `${axisFontSize}px`);
            xAxis.append("text")
                .attr("x", (width - margin.left - margin.right) / 2 + margin.left)
                .attr("y", margin.bottom - 10)
                .attr("fill", "#111")
                .style("text-anchor", "middle")
                .style("font-weight", "bold")
                .style("font-size", `${labelFontSize}px`)
                .text(xLabel);

            // Y Axis
            const yAxis = weather_svgHost.append("g")
                .attr("transform", `translate(${margin.left},0)`)
                .call(d3.axisLeft(yScale).ticks(Math.max(3, height / 80)));
            yAxis.selectAll("text").style("font-size", `${axisFontSize}px`);
            yAxis.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -(height - margin.top - margin.bottom) / 2 - margin.top)
                .attr("y", -margin.left + 15)
                .attr("fill", "#111")
                .style("text-anchor", "middle")
                .style("font-weight", "bold")
                .style("font-size", `${labelFontSize}px`)
                .text(yLabel);

            // Clip points inside chart area
            weather_svgHost.append("clipPath")
                .attr("id", "chart-area-clip")
                .append("rect")
                .attr("x", margin.left)
                .attr("y", margin.top)
                .attr("width", width - margin.left - margin.right)
                .attr("height", height - margin.top - margin.bottom);

            const chartGroup = weather_svgHost.append("g")
                .attr("clip-path", "url(#chart-area-clip)");

            const pointRadius = Math.max(3, Math.min(6, width / 150));
            chartGroup.selectAll("circle")
                .data(subset)
                .enter()
                .append("circle")
                .attr("cx", d => factor === "hot" ? xScale(d.trackTemp) : factor === "cold" ? xScale(d.airTemp) : factor === "rain" ? xScale(d.rainfall) : xScale(d.windSpeed))
                .attr("cy", d => yScale(d.performance))
                .attr("r", pointRadius)
                .attr("fill", factor === "hot" ? "#FF5733" : factor === "cold" ? "#337BFF" : factor === "rain" ? "#33B5FF" : "#33FF57")
                .attr("opacity", 0.7)
                .append("title")
                .text(d => `Round: ${d.race}\nPerformance: ${d.performance.toFixed(2)}`);

            // Chart title
            weather_svgHost.append("text")
                .attr("x", width / 2)
                .attr("y", margin.top / 2 + 10)
                .attr("text-anchor", "middle")
                .style("font-size", `${titleFontSize}px`)
                .style("font-weight", "bold")
                .text(`${weatherLabels[factor]} vs. Performance`);
        }

        // --- Slider logic with AbortController ---
        const slider = document.getElementById("weather-slider");
        const label = document.getElementById("weather-current");

        if (!slider || !label) {
            console.error("Slider or label not found!");
            return;
        }

        let eventCount = 0;
        
        slider.addEventListener("input", () => {
            eventCount++;
            console.log("Input event fired, count:", eventCount);
            if (signal.aborted) {
                console.log("Signal aborted, returning");
                return;
            }
            const selected = weatherOptions[+slider.value];
            label.textContent = weatherLabels[selected];
        }, { signal });

        slider.addEventListener("change", () => {
            eventCount++;
            console.log("Change event fired, count:", eventCount);
            if (signal.aborted) {
                console.log("Signal aborted, returning");
                return;
            }
            console.log("Updating chart to:", weatherOptions[+slider.value]);
            updateWeatherChart(weatherOptions[+slider.value]);
        }, { signal });

        // --- RESIZE HANDLER REMOVED FOR TESTING ---
        // If this fixes the issue, the problem is with the resize handler

        // --- Initial load ---
        updateWeatherChart("hot");
    })
    .catch(error => {
        console.error("Error loading or processing data:", error);
    });
}

// --- Clean CSV Data ---
function weather_cleanData(csvPath) {
    console.log("Starting to load CSV from:", csvPath);
    return d3.csv(csvPath)
        .then(weather_raw => {
            console.log("Raw CSV loaded, rows:", weather_raw.length);
            
            // First filter by year
            const filtered = weather_raw.filter(d => {
                const yr = +d.Year;
                return yr >= 2015 && yr <= 2023; // Range: 2015-2023
            });
            
            console.log("After year filter (2015-2023):", filtered.length);
            
            // Process the data
            const processed = filtered.map(d => {
                const airTemp = +d.AirTemp;
                const trackTemp = +d.TrackTemp;
                const windSpeed = +d.WindSpeed;
                const rainfall = d.Rainfall === "False" ? 0 : +d.Rainfall;

                let weather = "moderate";
                if (rainfall > 0) weather = "rain";
                else if (trackTemp >= 35) weather = "hot";
                else if (airTemp <= 15) weather = "cold";
                else if (windSpeed >= 25) weather = "windy";

                const performanceMetric =
                    (trackTemp * 1.5) +
                    (airTemp * 1.2) -
                    (windSpeed * 0.5) -
                    (rainfall * 20);

                return {
                    race: d["Round Number"] + "-" + d.Year,
                    performance: performanceMetric,
                    weather: weather,
                    year: +d.Year,
                    trackTemp,
                    airTemp,
                    rainfall,
                    windSpeed,
                    WindDirection: d.WindDirection
                };
            });
            
            console.log("Processing complete, final dataset:", processed.length);
            
            // Safety limit - take max 2000 rows (sample if needed)
            if (processed.length > 2000) {
                console.warn(`Dataset too large (${processed.length} rows), sampling to 2000`);
                // Take every Nth row to get roughly 2000 samples
                const step = Math.ceil(processed.length / 2000);
                return processed.filter((_, i) => i % step === 0);
            }
            
            return processed;
        })
        .catch(error => {
            console.error("Error in weather_cleanData:", error);
            throw error;
        });
}