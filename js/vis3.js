// === viz3.js - FINAL STABLE VERSION (Initialization Fix) ===

let viz3HasRun = false;

console.log("viz3.js loaded");

function debounce(func, timeout = 50){ 
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

let viz3AbortController = null;
let currentTempSetting = 25; // Controls the slider value (C)
let currentWeatherMode = 'hot'; // Controls the filter mode ('hot' or 'cold')
let weather_dataset_global = []; 

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

    // **FIX: Ensure correct path**
    const weather_csv = "data/f1_weather_2018_2023.csv"; // Using the original path which had a folder structure
    const viz3MainEl = document.getElementById("viz3-main");
    
    // **FIX: Initialize select element and mode robustly**
    const selectEl = document.getElementById("weather-select"); 
    if (selectEl) {
        currentWeatherMode = selectEl.value; 
    }

    // === FORCE FLEXBOX ON #viz3-main (Ensure vertical flow for slider/chart blocks) ===
    if (viz3MainEl) {
        viz3MainEl.style.display = 'flex';
        viz3MainEl.style.flexDirection = 'column';
        viz3MainEl.style.alignItems = 'center';
    }
    // ===============================================

    let tempSlider;
    let tempLabel;
    let weather_svgHost;

    // --- Safe UI injection: Creates the Flex layout and replaces 'Loading Weather Data...' ---
    (function safeUIInjection() {
        if (!viz3MainEl) return;
        
        // 1. Clear all existing content inside viz3-main
        viz3MainEl.innerHTML = ''; 
        
        // 2. Create the top wrapper (holds the slider and the main flex container)
        const wrapper = document.createElement("div");
        wrapper.className = "weather-slider-wrapper";
        wrapper.style.width = "100%";
        wrapper.style.maxWidth = "850px"; 
        wrapper.style.paddingBottom = "20px";
        wrapper.style.margin = '0 auto';
        
        // 3. Slider Control Container
        const controlsContainer = document.createElement("div");
        controlsContainer.style.display = 'flex';
        controlsContainer.style.flexDirection = 'column';
        controlsContainer.style.alignItems = 'center';
        controlsContainer.style.padding = '10px 0';

        // --- Temperature Threshold Control (Horizontal) ---
        const tempControl = document.createElement("div");
        tempControl.style.textAlign = 'center';
        tempControl.style.width = '100%';
        tempControl.style.maxWidth = '400px';
        tempControl.innerHTML = `
            <h4 style="color: #111; font-family: sans-serif; font-weight: bold;"><span id="mode-text">Minimum Air Temperature</span>: <span id="temp-current">${currentTempSetting.toFixed(1)}°C</span></h4>
            <input id="temp-slider" type="range" min="9.5" max="38" step="0.5" value="${currentTempSetting.toString()}" style="width: 100%;">
        `;
        controlsContainer.appendChild(tempControl);
        
        // --- 4. Container for Component and Chart (Crucial Flex row for side-by-side) ---
        const chartAndComponentContainer = document.createElement("div");
        chartAndComponentContainer.id = 'chart-component-container';
        
        // *** EXTREME FLEXBOX OVERRIDE ***
        chartAndComponentContainer.style.cssText = `
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important; 
            width: 100% !important;
            gap: 20px !important;
            margin-top: 20px !important;
            flex-wrap: wrap; /* Allows wrapping on small screens */
        `;

        // --- 5. Contextual Averages Component (LEFT) ---
        const averagesComponent = document.createElement("div");
        averagesComponent.id = "averages-component";
        averagesComponent.style.flexShrink = 0; 
        averagesComponent.style.width = '200px'; 
        averagesComponent.style.padding = '15px';
        averagesComponent.style.border = '1px solid #ccc';
        averagesComponent.style.borderRadius = '4px'; 
        averagesComponent.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)'; 
        averagesComponent.style.backgroundColor = '#fff'; 
        averagesComponent.style.fontFamily = 'sans-serif';
        chartAndComponentContainer.appendChild(averagesComponent);

        // --- 6. Chart Placeholder (RIGHT) ---
        const chartPlaceholder = document.createElement("div");
        chartPlaceholder.id = "chart-placeholder"; 
        chartPlaceholder.style.flexGrow = 1;
        chartPlaceholder.style.minWidth = '350px'; 
        chartAndComponentContainer.appendChild(chartPlaceholder);


        wrapper.appendChild(controlsContainer);
        wrapper.appendChild(chartAndComponentContainer);

        // Append the entire structure
        viz3MainEl.appendChild(wrapper);
        
        // Select the elements for global access
        tempSlider = document.getElementById("temp-slider");
        tempLabel = document.getElementById("temp-current");

        // Create the SVG host inside the placeholder
        weather_svgHost = d3.select("#chart-placeholder")
            .append("svg")
            .attr("id", "weather-svg")
            .attr("width", "100%")
            .style("display", "block");
            
    })(); 
    
    // Check elements *after* injection
    if (!weather_svgHost || !tempSlider || !tempLabel || !selectEl) {
        console.error("UI elements failed to initialize after injection or selection.");
        return;
    }


    // --- Load CSV and initialize chart ---
    weather_cleanData(weather_csv)
        .then(weather_dataset => {
            console.log("Dataset loaded successfully, size:", weather_dataset.length);
            weather_dataset_global = weather_dataset; 

            if (signal.aborted) return;

            // --- Core Chart Update Function (Handles both HOT and COLD filtering) ---
            function updateWeatherChart(temp, mode) {
                if (signal.aborted) return;
                
                const modeTextEl = document.getElementById("mode-text");
                
                // 1. FILTER DATASET based on current mode and temp setting
                let subset;
                let modeDisplay;

                if (mode === 'hot') {
                    // Hot Mode: Filter for races where airTemp is GREATER than or equal to the slider value (MINIMUM threshold)
                    subset = weather_dataset_global.filter(d => d.airTemp >= temp);
                    modeDisplay = `Air Temp ${temp.toFixed(1)}°C`;
                    modeTextEl.textContent = "Minimum Air Temperature";
                } else {
                    // Cold Mode: Filter for races where airTemp is LESS than or equal to the slider value (MAXIMUM threshold)
                    subset = weather_dataset_global.filter(d => d.airTemp <= temp);
                    modeDisplay = `Air Temp ${temp.toFixed(1)}°C`;
                    modeTextEl.textContent = "Maximum Air Temperature";
                }

                // 2. CALCULATE CONTEXTUAL AVERAGES and UPDATE COMPONENT
                const avgWind = d3.mean(subset, d => d.windSpeed) || 0;
                const avgRain = d3.mean(subset, d => d.rainfall) || 0;
                
                const averagesComponent = document.getElementById("averages-component");
                
                const racesCount = subset.length;

                let contentHTML = '';
                if (subset.length > 0) {
                    contentHTML = `
                        <h3 style="color: #111; font-weight: bold; margin-bottom: 5px; font-size: 1.2em;">Results:</h3>
                        <p style="color: #111; font-size: 0.9em; margin-bottom: 5px; line-height: 1.2;">Displayed Races: 
                             <strong style="color: var(--red, #D40000);">${racesCount}</strong>
                        </p>
                        <h4 style="margin-top: 15px; margin-bottom: 5px; color: #111; font-size: 1.1em;">Avg. Conditions:</h4>
                        <p style="color: #111; font-size: 0.9em; margin-bottom: 5px; line-height: 1.2;">Wind Speed: 
                            <strong style="color: var(--red, #D40000);">${avgWind.toFixed(1)} km/h</strong>
                        </p>
                        <p style="color: #111; font-size: 0.9em; margin-bottom: 0; line-height: 1.2;">Rainfall: 
                            <strong style="color: var(--red, #D40000);">${avgRain.toFixed(1)} mm</strong>
                        </p>
                    `;

                } else {
                    // Fallback using the current mode text to be accurate
                    contentHTML = `
                        <h3 style="color: #111; font-weight: bold; margin-bottom: 5px; font-size: 1.2em;">No Data Found</h3>
                        <p style="color: #111; font-size: 0.9em;">No races found with ${modeDisplay.replace(/(\$\$|\\le|\\ge)/g, '').trim()}. Please adjust the threshold.</p>
                    `;
                }
                averagesComponent.innerHTML = contentHTML;

                // 3. CHART RENDERING
                const { width, height, margin } = getResponsiveDimensions(d3.select("#chart-placeholder"));
                const transitionDuration = 700;
                
                weather_svgHost.attr("viewBox", `0 0 ${width} ${height}`);

                const xDataAccessor = d => d.airTemp;
                
                // Use the filtered subset for the domain limits if available, otherwise use all data
                const activeData = subset.length > 0 ? subset : weather_dataset_global;

                const xDomain = d3.extent(activeData, xDataAccessor);
                const yDomain = d3.extent(activeData, d => d.performance);
                
                // Re-check for empty domain after fallback logic
                if (xDomain[0] === undefined || yDomain[0] === undefined) {
                    weather_svgHost.selectAll(".chart-group circle").remove();
                    return; 
                }

                const xRange = xDomain[1] - xDomain[0];
                const yRange = yDomain[1] - yDomain[0];
                
                const xScale = d3.scaleLinear()
                    .domain([xDomain[0] - xRange * 0.05, xDomain[1] + xRange * 0.05])
                    .range([margin.left, width - margin.right]);

                const yScale = d3.scaleLinear()
                    .domain([yDomain[0] - yRange * 0.05, yDomain[1] + yRange * 0.05])
                    .nice()
                    .range([height - margin.bottom, margin.top]);
                
                
                // --- VISUALIZATION SETUP (Axes, Title, etc.) ---
                const xLabel = `Air Temperature (°C)`;
                const yLabel = `Performance Metric`;
                const color = "var(--red, #D40000)"; 
                
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

                // D3 General Update Pattern for Points
                const chartGroup = weather_svgHost.select(".chart-group");
                const pointRadius = Math.max(3, Math.min(6, width / 150));
                
                const circles = chartGroup.selectAll("circle")
                    .data(subset, d => d.race); 

                circles.exit().transition(t).attr("r", 0).remove(); 

                const enterCircles = circles.enter()
                    .append("circle")
                    .attr("cx", d => xScale(xDataAccessor(d))) 
                    .attr("cy", height - margin.bottom) 
                    .attr("r", 0) 
                    .attr("fill", color)
                    .attr("opacity", 0.7);

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


            // --- Event Listener Logic ---
            
            const debouncedChartUpdate = debounce(() => {
                if (!signal.aborted) {
                    updateWeatherChart(currentTempSetting, currentWeatherMode);
                }
            }, 50);

            // 1. Temperature Slider Input
            tempSlider.addEventListener("input", () => {
                currentTempSetting = +tempSlider.value;
                tempLabel.textContent = `${currentTempSetting.toFixed(1)}°C`;
                debouncedChartUpdate();
            }, { signal });

            // 2. Weather Mode Select Input (Hot/Cold)
            selectEl.addEventListener("change", () => {
                currentWeatherMode = selectEl.value;
                // Reset the slider to a sensible default midpoint when switching modes
                currentTempSetting = 25; 
                tempSlider.value = currentTempSetting;
                tempLabel.textContent = `${currentTempSetting.toFixed(1)}°C`;
                debouncedChartUpdate();
            }, { signal });

            // --- Initial load ---
            currentTempSetting = +tempSlider.value;
            // **FIX: Call the update function AFTER the data is loaded**
            updateWeatherChart(currentTempSetting, currentWeatherMode);
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