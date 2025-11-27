// === viz3.js - FINAL STABILIZED VERSION (Temp Slider + Contextual Averages) ===

let viz3HasRun = false;

console.log("viz3.js loaded");

// Function to limit how often an event handler runs (Debouncing)
function debounce(func, timeout = 50){ 
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// Global abort controller for cleanup
let viz3AbortController = null;

// Global variable for the current state (Min Temperature Threshold)
let currentTempThreshold = 25; // Default: 25°C

let weather_dataset_global = []; // To store the parsed data

document.addEventListener("DOMContentLoaded", function () {
    console.log("DOMContentLoaded fired");
    
    if (typeof d3 === 'undefined') {
        console.error("D3.js is not loaded!");
        return;
    }
    const container = document.getElementById("viz3-main");
    if (!container) {
        console.error("#viz3-main element not found!");
        return;
    }
    
    if (viz3HasRun) {
        console.warn("viz3 already executed, blocking duplicate call");
        return;
    }
    viz3HasRun = true;
    
    try {
        viz3();
    } catch (error) {
        console.error("Error in viz3():", error);
    }
});

// --- Helper function for responsive dimensions ---
function getResponsiveDimensions(container) {
    const containerWidth = container.node().getBoundingClientRect().width;
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


function viz3() {
    console.log("viz3() function started");
    
    if (viz3AbortController) {
        viz3AbortController.abort();
    }
    
    viz3AbortController = new AbortController();
    const signal = viz3AbortController.signal;

    const weather_csv = "data/kaggle/weather/f1_weather_2018_2023.csv";
    const weather_container = d3.select("#viz3-main");

    // --- Safe UI injection: Create ONLY the Temperature Slider ---
    (function safeUIInjection() {
        const selectEl = document.getElementById("weather-select");
        if (!selectEl) return;

        const existingWrapper = document.querySelector(".weather-slider-wrapper");
        if (existingWrapper) {
            existingWrapper.remove();
        }

        const wrapper = document.createElement("div");
        wrapper.className = "weather-slider-wrapper";
        wrapper.style.width = "100%";
        wrapper.style.maxWidth = "700px";
        wrapper.style.paddingBottom = "20px";
        wrapper.style.margin = '0 auto';
        
        const controlsContainer = document.createElement("div");
        controlsContainer.style.display = 'flex';
        controlsContainer.style.flexDirection = 'column';
        controlsContainer.style.alignItems = 'center';
        controlsContainer.style.padding = '10px 0';

        // --- 1. Temperature Min Threshold (Horizontal) ---
        const tempControl = document.createElement("div");
        tempControl.style.textAlign = 'center';
        tempControl.style.width = '100%';
        tempControl.style.maxWidth = '400px';
        tempControl.innerHTML = `
            <h4>Air Temperature: <span id="temp-current">${currentTempThreshold.toFixed(1)}°C</span></h4>
            <input id="temp-slider" type="range" min="5" max="45" step="0.5" value="${currentTempThreshold.toString()}" style="width: 100%;">
        `;
        controlsContainer.appendChild(tempControl);
        
        // --- 2. Contextual Averages Display (Will be updated by JS) ---
        // const averagesText = document.createElement("div");
        // averagesText.id = "averages-text";
        // averagesText.style.marginTop = "15px";
        // averagesText.style.fontSize = "1.1em";
        // averagesText.style.textAlign = "center";
        // controlsContainer.appendChild(averagesText);

        const averagesBox = document.createElement("div");
        averagesBox.className = "averages-box";
        averagesBox.innerHTML = `<div id="averages-text"></div>`;
        controlsContainer.appendChild(averagesBox);


        wrapper.appendChild(controlsContainer);
        selectEl.parentNode.insertBefore(wrapper, selectEl);
        selectEl.style.display = "none";
    })();

    // --- Load CSV and initialize chart ---
    weather_cleanData(weather_csv)
        .then(weather_dataset => {
            console.log("Dataset loaded successfully, size:", weather_dataset.length);
            weather_dataset_global = weather_dataset; 

            if (signal.aborted) return;

            weather_container.select(".awaitingText").remove();
            weather_container.select("#weather-svg").remove();

            // Slider element for input
            const tempSlider = document.getElementById("temp-slider");

            const weather_svgHost = weather_container
                .append("svg")
                .attr("id", "weather-svg")
                .attr("width", "100%")
                .style("display", "block");

            // --- Core Chart Update Function ---
            function updateWeatherChart(temp) {
                if (signal.aborted) return;
                
                const { width, height, margin } = getResponsiveDimensions(weather_container);
                const transitionDuration = 700;
                
                weather_svgHost.attr("viewBox", `0 0 ${width} ${height}`);

                // 1. Filter Dataset based ONLY on Air Temperature
                const subset = weather_dataset_global.filter(d => 
                    d.airTemp >= temp
                );
                
                // --- CALCULATE CONTEXTUAL AVERAGES ---
                const avgWind = d3.mean(subset, d => d.windSpeed) || 0;
                const avgRain = d3.mean(subset, d => d.rainfall) || 0;
                
                // Update the two-line summary text
                const averagesDiv = document.getElementById("averages-text");
                if (subset.length > 0) {
                    averagesDiv.innerHTML = 
                        `The average wind speed being ${avgWind.toFixed(1)} km/h.`+
                        `<h6>The </h6>`
                } else {
                    // Fallback if the threshold is too high and dataset is empty
                    averagesDiv.innerHTML = `No races found with a temperature $\ge$ ${temp.toFixed(1)}°C. Please lower the threshold.`;
                }

                
                // --- SCALES (DYNAMIC DOMAINS WITH FALLBACK) ---
                const xDataAccessor = d => d.airTemp;
                
                // Use the filtered subset domain, but FALLBACK to the full dataset if subset is empty
                const activeData = subset.length > 0 ? subset : weather_dataset_global;

                const xDomain = d3.extent(activeData, xDataAccessor);
                const yDomain = d3.extent(activeData, d => d.performance);
                
                // Basic checks for safety (should be fine with fallback)
                if (xDomain[0] === undefined || yDomain[0] === undefined) {
                    console.warn("Domain is empty, skipping chart update.");
                    return; 
                }

                // Add padding to the domain
                const xRange = xDomain[1] - xDomain[0];
                const yRange = yDomain[1] - yDomain[0];
                
                const xScale = d3.scaleLinear()
                    .domain([xDomain[0] - xRange * 0.05, xDomain[1] + xRange * 0.05])
                    .range([margin.left, width - margin.right]);

                const yScale = d3.scaleLinear()
                    .domain([yDomain[0] - yRange * 0.05, yDomain[1] + yRange * 0.05])
                    .nice()
                    .range([height - margin.bottom, margin.top]);
                
                
                // --- VISUALIZATION SETUP ---
                const xLabel = `Air Temperature (°C)`;
                const yLabel = `Performance Metric`;
                const color = "#1e90ff"; 
                
                const axisFontSize = Math.max(10, width / 60);
                const labelFontSize = Math.max(12, width / 50);
                const titleFontSize = Math.max(14, width / 45);
                
                
                if (weather_svgHost.select(".x-axis").empty()) {
                    weather_svgHost.append("g").attr("class", "x-axis");
                    weather_svgHost.append("g").attr("class", "y-axis");
                    weather_svgHost.append("text").attr("class", "chart-title");
                    weather_svgHost.append("clipPath").attr("id", "chart-area-clip").append("rect").attr("class", "clip-rect");
                    weather_svgHost.append("g").attr("class", "chart-group").attr("clip-path", "url(#chart-area-clip)");
                    
                    weather_svgHost.select(".y-axis").append("text")
                        .attr("class", "axis-label")
                        .attr("transform", "rotate(-90)")
                        .attr("fill", "#111")
                        .style("text-anchor", "middle")
                        .style("font-weight", "bold");
                }
                
                const t = weather_svgHost.transition().duration(transitionDuration);

                weather_svgHost.select(".clip-rect")
                    .attr("x", margin.left)
                    .attr("y", margin.top)
                    .attr("width", width - margin.left - margin.right)
                    .attr("height", height - margin.top - margin.bottom);


                const xAxisGroup = weather_svgHost.select(".x-axis");
                xAxisGroup.transition(t)
                    .attr("transform", `translate(0,${height - margin.bottom})`)
                    .call(d3.axisBottom(xScale).ticks(Math.max(3, width / 150)))
                    .selectAll("text").style("font-size", `${axisFontSize}px`);

                xAxisGroup.select(".axis-label").remove(); 
                xAxisGroup.append("text")
                    .attr("class", "axis-label")
                    .attr("x", (width - margin.left - margin.right) / 2 + margin.left)
                    .attr("y", margin.bottom - 10)
                    .attr("fill", "#111")
                    .style("text-anchor", "middle")
                    .style("font-weight", "bold")
                    .style("font-size", `${labelFontSize}px`)
                    .text(xLabel);

                const yAxisGroup = weather_svgHost.select(".y-axis");
                yAxisGroup.transition(t)
                    .attr("transform", `translate(${margin.left},0)`)
                    .call(d3.axisLeft(yScale).ticks(Math.max(3, height / 80)))
                    .selectAll("text").style("font-size", `${axisFontSize}px`);
                
                yAxisGroup.select(".axis-label")
                    .attr("x", -(height - margin.top - margin.bottom) / 2 - margin.top)
                    .attr("y", -margin.left + 15)
                    .style("font-size", `${labelFontSize}px`)
                    .text(yLabel);

                weather_svgHost.select(".chart-title")
                    .attr("x", width / 2)
                    .attr("y", margin.top / 2 + 10)
                    .attr("text-anchor", "middle")
                    .style("font-size", `${titleFontSize}px`)
                    .style("font-weight", "bold")
                    .text(`Air Temperature vs. Performance (${subset.length} Races Displayed)`);

                // --- D3 General Update Pattern for Points (Smooth Transition) ---
                const chartGroup = weather_svgHost.select(".chart-group");
                const pointRadius = Math.max(3, Math.min(6, width / 150));
                
                const circles = chartGroup.selectAll("circle")
                    .data(subset, d => d.race); 

                // EXIT selection: Points leaving the data (fades out)
                circles.exit()
                    .transition(t)
                    .attr("r", 0)
                    .remove(); 

                // ENTER selection: New points appearing (from the bottom)
                const enterCircles = circles.enter()
                    .append("circle")
                    .attr("cx", d => xScale(xDataAccessor(d))) 
                    .attr("cy", height - margin.bottom) 
                    .attr("r", 0) 
                    .attr("fill", color)
                    .attr("opacity", 0.7);

                // MERGE and TRANSITION (Applies to both existing and new circles)
                enterCircles.merge(circles)
                    .transition(t)
                    .attr("cx", d => xScale(xDataAccessor(d)))
                    .attr("cy", d => yScale(d.performance))
                    .attr("r", pointRadius)
                    .attr("fill", color);
                    
                // Update Tooltips
                chartGroup.selectAll("circle").select("title").remove(); 
                chartGroup.selectAll("circle").append("title")
                    .text(d => 
                        `Round: ${d.race}\nTemp: ${d.airTemp.toFixed(1)}°C\nRain: ${d.rainfall.toFixed(1)} mm\nWind: ${d.windSpeed.toFixed(1)} km/h\nPerformance: ${d.performance.toFixed(2)}`
                    );
            } 
            // --- END updateWeatherChart function ---


            // --- Event Listener Logic for Temp Slider ---
            const tempLabel = document.getElementById("temp-current");

            const debouncedChartUpdate = debounce(() => {
                if (!signal.aborted) {
                    updateWeatherChart(currentTempThreshold);
                }
            }, 50);

            // Temperature Slider Input
            tempSlider.addEventListener("input", () => {
                currentTempThreshold = +tempSlider.value;
                tempLabel.textContent = `${currentTempThreshold.toFixed(1)}°C`;
                debouncedChartUpdate();
            }, { signal });

            // --- Initial load ---
            currentTempThreshold = +tempSlider.value;
            updateWeatherChart(currentTempThreshold);
        })
    .catch(error => {
        console.error("Error loading or processing data:", error);
    });
}

// --- Clean CSV Data (remains the same) ---
function weather_cleanData(csvPath) {
    return d3.csv(csvPath)
        .then(weather_raw => {
            const filtered = weather_raw.filter(d => {
                const yr = +d.Year;
                return yr >= 2015 && yr <= 2023;
            });
            
            const processed = filtered.map(d => {
                const airTemp = +d.AirTemp;
                const trackTemp = +d.TrackTemp;
                const windSpeed = +d.WindSpeed;
                const rainfall = d.Rainfall === "False" ? 0 : +d.Rainfall; 

                // Performance Metric
                const performanceMetric =
                    (trackTemp * 1.5) +
                    (airTemp * 1.2) -
                    (windSpeed * 0.5) -
                    (rainfall * 20);

                return {
                    race: d["Round Number"] + "-" + d.Year,
                    performance: performanceMetric,
                    year: +d.Year,
                    trackTemp,
                    airTemp,
                    rainfall,
                    windSpeed,
                    WindDirection: d.WindDirection
                };
            });

            if (processed.length > 2000) {
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
