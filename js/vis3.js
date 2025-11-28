// === viz3.js - FINAL STABLE VERSION (Initialization Fix) ===

let viz3HasRun = false;

console.log("viz3.js loaded");

function debounce(func, timeout = 50) {
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
let tooltip;
let weather_lengendHost;

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
    const height = Math.max(450, width * 0.75);

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
    // --- Safe UI injection: Creates the Flex layout and replaces 'Loading Weather Data...' ---
    (function safeUIInjection() {
        if (!viz3MainEl) return;

        // 1. Clear all existing content inside viz3-main
        viz3MainEl.innerHTML = '';

        // 2. Create the top wrapper (holds everything)
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

        // --- 4. Legend Container (NEW POSITION: Right below the slider, at the top) ---
        const legendContainer = document.createElement("div");
        legendContainer.id = "weather-legend-container";
        legendContainer.style.width = "100%";
        legendContainer.style.maxWidth = "850px";
        legendContainer.style.marginTop = "20px";
        legendContainer.style.marginBottom = "20px"; // Added space before chart
        legendContainer.style.textAlign = "center";


        // --- 5. Container for Component and Chart (Side-by-side row) ---
        const chartAndComponentContainer = document.createElement("div");
        chartAndComponentContainer.id = 'chart-component-container';

        // *** EXTREME FLEXBOX OVERRIDE ***
        chartAndComponentContainer.style.cssText = `
        display: flex !important;
        justify-content: center !important;
        align-items: flex-start !important; 
        width: 100% !important;
        gap: 25px !important; /* Increased gap */
        flex-wrap: wrap; 
    `;

        // --- 6. Contextual Averages Component (LEFT) ---
        const averagesComponent = document.createElement("div");
        averagesComponent.id = "averages-component";
        averagesComponent.style.flexShrink = 0;
        averagesComponent.style.width = '220px'; // Slightly wider component
        averagesComponent.style.padding = '18px'; // Increased padding
        averagesComponent.style.border = '1px solid #ccc';
        averagesComponent.style.borderRadius = '8px'; // Rounded corners
        averagesComponent.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)'; // Softer shadow
        averagesComponent.style.backgroundColor = '#f9f9f9'; // Light background
        averagesComponent.style.fontFamily = 'sans-serif';
        chartAndComponentContainer.appendChild(averagesComponent);

        // --- 7. Chart Placeholder (RIGHT) ---
        const chartPlaceholder = document.createElement("div");
        chartPlaceholder.id = "chart-placeholder";
        chartPlaceholder.style.flexGrow = 1;
        chartPlaceholder.style.minWidth = '350px';
        chartAndComponentContainer.appendChild(chartPlaceholder);


        

        // --- ASSEMBLE ---
        wrapper.appendChild(controlsContainer);
        wrapper.appendChild(legendContainer); // Legend is now high up
        wrapper.appendChild(chartAndComponentContainer);

        viz3MainEl.appendChild(wrapper);

        // Select the elements for global access
        tempSlider = document.getElementById("temp-slider");
        tempLabel = document.getElementById("temp-current");

        // Create the SVG host inside the placeholder (ONLY ONCE)
        weather_svgHost = d3.select("#chart-placeholder")
            .append("svg")
            .attr("id", "weather-svg")
            .attr("width", "100%")
            .style("display", "block");

        // Create the Legend SVG host (ONLY ONCE)
        weather_legendHost = d3.select("#weather-legend-container")
            .append("svg")
            .attr("width", "100%")
            .attr("height", 50)
            .attr("id", "weather-legend-svg");

    })();


    // Check elements *after* injection
    if (!weather_svgHost || !tempSlider || !tempLabel || !selectEl) {
        console.error("UI elements failed to initialize after injection or selection.");
        return;
    }


    // tooltip for hovering:

    tooltip = d3.select("body").append("div")
        .attr("class", "custom-tooltip")
        .style("opacity", 0) // Start invisible
        .style("position", "absolute")
        .style("pointer-events", "none") // Ensures it doesn't block mouse events on circles
        .style("background-color", "white")
        .style("border", "1px solid #333")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("line-height", "1.4")
        .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)");


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
                        <h3 style="color: #333; font-weight: 800; margin-bottom: 12px; font-size: 1.3em; border-bottom: 2px solid #ddd; padding-bottom: 5px;">Performance Context</h3>
                        
                        <div style="margin-bottom: 15px;">
                            <p style="color: #111; font-size: 1em; margin-bottom: 5px; line-height: 1.2;">
                                <strong>Races Displayed:</strong> 
                                <span style="font-size: 1.1em; color: var(--red, #D40000); font-weight: bold; float: right;">${racesCount}</span>
                            </p>
                        </div>

                        <h4 style="margin-top: 15px; margin-bottom: 8px; color: #555; font-size: 1.1em; font-weight: 600;">Average Conditions:</h4>
                        
                        <p style="color: #111; font-size: 0.95em; margin-bottom: 5px; line-height: 1.2;">
                            Wind Speed: 
                            <strong style="color: #D40000; float: right;">${avgWind.toFixed(1)} km/h</strong>
                        </p>
                        <p style="color: #111; font-size: 0.95em; margin-bottom: 0; line-height: 1.2;">
                            Rainfall: 
                            <strong style="color: #D40000; float: right;">${avgRain.toFixed(1)} mm</strong>
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


                // --- COLOR SCALE SETUP (NEW) ---
                const yearDomain = d3.extent(weather_dataset_global, d => d.year);

                // Define the custom color interpolator function
                const customInterpolator = d3.interpolateRgb("#d6d6d6ff", "#303030ff");

                // Use d3.scaleSequential to map the year domain (e.g., 2015-2023)
                // to the custom color interpolator function.
                const colorScale = d3.scaleSequential()
                    .domain(yearDomain)
                    .interpolator(customInterpolator);

                // --- UPDATE LEGEND (NEW) ---
                updateYearLegend(colorScale, yearDomain);


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
                //const color = "var(--red, #D40000)"; 

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
                const pointRadius = Math.max(5, Math.min(8, width / 150));

                const circles = chartGroup.selectAll("circle")
                    .data(subset, d => d.race);

                circles.exit().transition(t).attr("r", 0).remove();

                const enterCircles = circles.enter()
                    .append("circle")
                    .attr("cx", d => xScale(xDataAccessor(d)))
                    .attr("cy", height - margin.bottom)
                    .attr("r", 0)
                    .attr("opacity", 0.85) // INCREASED OPACITY to make color more visible
                    .attr("fill", d => colorScale(d.year));

                enterCircles.merge(circles)
                    .transition(t)
                    .attr("fill", d => colorScale(d.year))
                    .attr("opacity", 0.85) // ENSURED: Keep opacity consistent
                    .attr("cx", d => xScale(xDataAccessor(d)))
                    .attr("cy", d => yScale(d.performance))
                    .attr("r", pointRadius);

                // ---------------------------------------------------------------------------------
                // START: Custom Tooltip Event Handlers (REPLACE <title> logic here)
                // ---------------------------------------------------------------------------------

                // 1. Remove the old <title> elements if they exist (for cleanup)
                chartGroup.selectAll("circle").select("title").remove();

                // 2. Add interaction handlers to the circles
                chartGroup.selectAll("circle")
                    .on("mouseover", function (event, d) {
                        // Show tooltip and highlight dot
                        tooltip.transition().duration(200).style("opacity", 0.9);
                        d3.select(this).attr("r", pointRadius * 1.5).style("stroke", "#333").style("stroke-width", 2);
                    })
                    .on("mousemove", function (event, d) {
                        // Update tooltip content and position
                        const content = `
                            <strong>Race:</strong> ${d.race}<br>
                            ---<br>
                            <strong>Air Temp:</strong> ${d.airTemp.toFixed(1)}°C<br>
                            <strong>Track Temp:</strong> ${d.trackTemp.toFixed(1)}°C<br>
                            <strong>Wind Speed:</strong> ${d.windSpeed.toFixed(1)} km/h<br>
                            <strong>Rainfall:</strong> ${d.rainfall.toFixed(1)} mm<br>
                            ---<br>
                            <strong>Performance:</strong> ${d.performance.toFixed(2)}
                        `;

                        tooltip.html(content)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function (event, d) {
                        // Hide tooltip and reset dot style
                        tooltip.transition().duration(500).style("opacity", 0);
                        d3.select(this).attr("r", pointRadius).style("stroke", "none");
                    });

                // ---------------------------------------------------------------------------------
                // END: Custom Tooltip Event Handlers
                // ---------------------------------------------------------------------------------


                // // Update Tooltips
                // chartGroup.selectAll("circle").select("title").remove(); 
                // chartGroup.selectAll("circle").append("title")
                //     .text(d => 
                //         `Round: ${d.race}\nTemp: ${d.airTemp.toFixed(1)}°C\nRain: ${d.rainfall.toFixed(1)} mm\nWind: ${d.windSpeed.toFixed(1)} km/h\nPerformance: ${d.performance.toFixed(2)}`
                //     );
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


// --- NEW: Legend Function ---
function updateYearLegend(colorScale, yearDomain) {
    if (!weather_legendHost) return;

    const svgWidth = weather_legendHost.node().getBoundingClientRect().width;
    const itemHeight = 15; // Height of each legend item (box + text)
    const padding = 5;
    const boxSize = 10;
    
    // 1. Determine unique years present in the overall dataset
    // We create an array of all unique years in the global dataset
    const uniqueYears = Array.from(new Set(weather_dataset_global.map(d => d.year)))
                        .sort(d3.ascending);
    
    // Calculate the required SVG height (multiple rows might be needed)
    // We'll aim for 4 items per row, or adjust based on screen width.
    const itemsPerRow = Math.min(4, Math.max(1, Math.floor(svgWidth / 150))); 
    const numRows = Math.ceil(uniqueYears.length / itemsPerRow);
    const requiredHeight = (numRows * itemHeight) + (numRows * padding) + 20;

    weather_legendHost.attr("height", requiredHeight); 

    // 2. Setup Legend Group
    const g = weather_legendHost.selectAll(".legend-group").data([null]);
    const gMerge = g.enter().append("g").attr("class", "legend-group").merge(g);
    
    // Clear existing contents to avoid duplicates
    gMerge.selectAll("*").remove(); 

    // 3. Legend Title (Centered)
    gMerge.append("text")
        .attr("class", "legend-title")
        .attr("x", svgWidth / 2)
        .attr("y", itemHeight)
        .style("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .text("Race Year");

    // 4. Draw Legend Items
    const legendItems = gMerge.selectAll(".legend-item")
        .data(uniqueYears)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => {
            const row = Math.floor(i / itemsPerRow);
            const col = i % itemsPerRow;
            
            // Adjust X position to center the group and space items out
            const totalItemWidth = svgWidth / itemsPerRow;
            const xOffset = (totalItemWidth * col) + (totalItemWidth / 2); // Center items within their column space
            
            const yOffset = (row * itemHeight) + (row * padding) + itemHeight + 5; // Start below the title
            
            return `translate(${xOffset}, ${yOffset})`;
        });

    // 4a. Colored Rectangle
    legendItems.append("rect")
        .attr("x", -boxSize) // Shift left to center text/box pair
        .attr("y", -boxSize / 2) // Shift up to center box vertically
        .attr("width", boxSize)
        .attr("height", boxSize)
        .style("fill", d => colorScale(d)); // Use colorScale for the year

    // 4b. Year Label
    legendItems.append("text")
        .attr("x", boxSize) // Position label to the right of the box
        .attr("y", 0) 
        .style("font-size", "10px")
        .style("dominant-baseline", "middle") // Vertically center text
        .style("text-anchor", "start")
        .text(d => d);
}