//
// === UPDATED VERSION: js/vis2.js ===
//
document.addEventListener("DOMContentLoaded", function () {
    // Check if we are on the main page and viz2 exists
    if (!document.getElementById("viz2")) {
        return;
    }

    viz2(); // Initialize the visualization

    function viz2() {
        // --- CSV File Paths ---
        const DATA_PATH = "data/kaggle/";
        const RACES_FILE = DATA_PATH + "races.csv";
        const DRIVERS_FILE = DATA_PATH + "drivers.csv";
        const CONSTRUCTORS_FILE = DATA_PATH + "constructors.csv";
        const RESULTS_FILE = DATA_PATH + "results.csv";
        const PITSTOPS_FILE = DATA_PATH + "pit_stops.csv";
        const LAPTIMES_FILE = DATA_PATH + "lap_times.csv";

        // --- DOM Selections ---
        const carContainer = d3.select("#carContainer");
        const modal = d3.select("#viz2-modal");
        const modalTitle = d3.select("#modal-title");
        const modalChart = d3.select("#modal-chart");
        const modalOvertakes = d3.select("#modal-overtakes");
        const modalDescription = d3.select("#modal-description");

        // Select the close button specifically within the Viz 2 modal
        const modalCloseBtn = modal.select(".close-btn");

        const yearSelect = d3.select("#viz2-yearSelect");
        const teamSelect = d3.select("#viz2-teamSelect");
        const driverSelect = d3.select("#viz2-driverSelect");

        const infoTeamName = d3.select("#info-teamName");
        const infoDriverName = d3.select("#info-driverName");

        // --- TOOLTIP CREATION ---
        const tooltip = d3.select("body").append("div")
            .attr("class", "viz2-d3-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)") // Semi-transparent black
            .style("color", "#fff")
            .style("padding", "6px 10px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none") // Let mouse events pass through
            .style("display", "none")        // Hidden by default
            .style("z-index", "9999")
            .style("font-family", "sans-serif");

        // --- State ---
        let kaggleData = {};
        let selected = {};

        // --- Initialization ---
        loadData();
        loadSVG();

        // --- Event Listeners ---
        yearSelect.on("change", handleYearChange);
        teamSelect.on("change", handleTeamChange);
        driverSelect.on("change", handleDriverChange);
        modalCloseBtn.on("click", closeModal);

        // --- Data Loading Chain ---
        async function loadData() {
            try {
                const [races, drivers, constructors, results, pitStops, lapTimes] = await Promise.all([
                    d3.csv(RACES_FILE, d3.autoType),
                    d3.csv(DRIVERS_FILE, d3.autoType),
                    d3.csv(CONSTRUCTORS_FILE, d3.autoType),
                    d3.csv(RESULTS_FILE, d3.autoType),
                    d3.csv(PITSTOPS_FILE, d3.autoType),
                    d3.csv(LAPTIMES_FILE, d3.autoType)
                ]);

                kaggleData = { races, drivers, constructors, results, pitStops, lapTimes };

                kaggleData.drivers.forEach(d => {
                    d.fullName = `${d.forename} ${d.surname}`;
                });

                console.log("Kaggle data loaded:", kaggleData);
                populateYears();

            } catch (error) {
                console.error("Error loading CSV data:", error);
                carContainer.html("<p>Error: Could not load CSV files. Check /data/kaggle/ folder.</p>");
                yearSelect.html("<option>Error loading data</option>");
            }
        }

        function populateYears() {
            const years = [...new Set(kaggleData.races.map(d => d.year))].sort(d3.descending);
            const recentYears = years.filter(y => y >= 2010);

            yearSelect.selectAll("option")
                .data(recentYears)
                .enter()
                .append("option")
                .attr("value", d => d)
                .text(d => d);

            handleYearChange();
        }

        function handleYearChange() {
            const year = +yearSelect.property("value");
            clearDropdowns([teamSelect, driverSelect]);
            clearInfo();
            teamSelect.append("option").text("Loading teams...");

            const firstRace = kaggleData.races
                .filter(d => d.year === year)
                .sort((a, b) => a.round - b.round)[0];

            if (!firstRace) {
                teamSelect.html("<option>No race data for year</option>");
                return;
            }

            selected.raceId = firstRace.raceId;
            console.log(`Selected Race: ${firstRace.name} (raceId: ${selected.raceId})`);

            const resultsForRace = kaggleData.results.filter(d => d.raceId === selected.raceId);
            const constructorIds = [...new Set(resultsForRace.map(d => d.constructorId))];

            const teams = kaggleData.constructors
                .filter(c => constructorIds.includes(c.constructorId))
                .sort((a, b) => a.name.localeCompare(b.name));

            clearDropdowns([teamSelect]);
            teamSelect.selectAll("option")
                .data(teams)
                .enter()
                .append("option")
                .attr("value", d => d.constructorId)
                .text(d => d.name);

            handleTeamChange();
        }

        function handleTeamChange() {
            const constructorId = +teamSelect.property("value");
            clearDropdowns([driverSelect]);

            selected.constructorId = constructorId;

            const driverIds = kaggleData.results
                .filter(d => d.raceId === selected.raceId && d.constructorId === selected.constructorId)
                .map(d => d.driverId);

            const drivers = kaggleData.drivers
                .filter(d => driverIds.includes(d.driverId));

            driverSelect.selectAll("option")
                .data(drivers)
                .enter()
                .append("option")
                .attr("value", d => d.driverId)
                .text(d => d.fullName);

            handleDriverChange();
        }

        function handleDriverChange() {
            const driverId = +driverSelect.property("value");
            if (!driverId || !kaggleData.drivers) {
                clearInfo();
                return;
            }

            selected.driverId = driverId;

            const driver = kaggleData.drivers.find(d => d.driverId === driverId);
            const team = kaggleData.constructors.find(c => c.constructorId === selected.constructorId);

            if (driver && team) {
                infoTeamName.text(team.name);
                infoDriverName.text(driver.fullName);
            }
        }

        // --- SVG Loading & Interaction ---
        function loadSVG() {
            d3.xml("images/f1-car.svg").then(data => {
                carContainer.html(""); // Clear "Loading Car..."

                // --- FLEXBOX CENTERING ---
                // Ensure container is a flex column so Title and SVG stack and center
                carContainer
                    .style("display", "flex")
                    .style("flex-direction", "column")
                    .style("align-items", "center")
                    .style("justify-content", "start");

                // --- ADD TITLE ABOVE CAR ---
                carContainer.append("h3")
                    .text("Click on the car to view more!")
                    .style("text-align", "center")
                    .style("margin-bottom", "10px");

                const svgNode = data.documentElement;
                svgNode.id = "interactive-car-svg";
                carContainer.node().append(svgNode);

                const svg = d3.select(svgNode);

                // --- LOWER THE CAR ---
                // Adding margin to the top of the SVG to push it down a bit
                svg.style("margin-top", "100px");

                // --- D3 TOOLTIP INTERACTION ---

                // 1. Tires -> Pit Stop Data
                svg.select("#clickable-tires")
                    .classed("interactive-part", true)
                    .on("click", showPitstopData)
                    .on("mouseover", (e) => showTooltip(e, "Click to view Pit Stop vs. Position"))
                    .on("mousemove", moveTooltip)
                    .on("mouseout", hideTooltip);

                // 2. Engine -> Lap Time Data
                svg.select("#clickable-engine")
                    .classed("interactive-part", true)
                    .on("click", showLapTimeData)
                    .on("mouseover", (e) => showTooltip(e, "Click to view Lap Time Performance"))
                    .on("mousemove", moveTooltip)
                    .on("mouseout", hideTooltip);

                // 3. Rear Wing -> Position Data
                svg.select("#clickable-rear-wing")
                    .classed("interactive-part", true)
                    .on("click", showPositionData)
                    .on("mouseover", (e) => showTooltip(e, "Click to view Race Position"))
                    .on("mousemove", moveTooltip)
                    .on("mouseout", hideTooltip);

            }).catch(err => {
                console.error("Error loading SVG:", err);
                carContainer.html("<p>Error loading car SVG.</p>");
            });
        }

        // --- Tooltip Helper Functions ---
        function showTooltip(event, text) {
            tooltip
                .text(text)
                .style("display", "block");

            d3.select(event.currentTarget).style("opacity", "0.8");
        }

        function moveTooltip(event) {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px");
        }

        function hideTooltip(event) {
            tooltip.style("display", "none");
            d3.select(event.currentTarget).style("opacity", null);
        }

        // --- Click Handlers & Modal Functions ---

        function showPitstopData() {
            const { driverId, raceId } = selected;
            if (!driverId) return alert("Please select a driver.");

            tooltip.style("display", "none");

            const driver = kaggleData.drivers.find(d => d.driverId === driverId);
            const driverName = driver.fullName;
            openModal(`Pit Stop vs. Position: ${driverName}`);

            const raceResults = kaggleData.results.filter(d => d.raceId === raceId);
            const racePitStops = kaggleData.pitStops.filter(d => d.raceId === raceId);

            const plotData = raceResults.map(result => {
                const dId = result.driverId;
                const finalPosition = result.positionOrder;
                const cId = result.constructorId;

                const driverInfo = kaggleData.drivers.find(d => d.driverId === dId);
                const name = driverInfo ? driverInfo.fullName : 'Unknown';

                const teamInfo = kaggleData.constructors.find(c => c.constructorId === cId);
                const teamName = teamInfo ? teamInfo.name : 'Unknown';

                const driverPitStops = racePitStops.filter(p => p.driverId === dId);

                let avgPitstopTime = 0;
                if (driverPitStops.length > 0) {
                    avgPitstopTime = d3.mean(driverPitStops, p => p.duration);
                }

                return {
                    driverId: dId,
                    driverName: name,
                    teamName: teamName,
                    finalPosition: finalPosition,
                    avgPitstopTime: avgPitstopTime
                };
            }).filter(d => d.avgPitstopTime > 0);

            clearModal();
            modalDescription.html(`This scatter plot shows the <strong>Final Race Position</strong> vs. <strong>Average Pit Stop Time (seconds)</strong> 
                                    for all drivers in the race. Does a faster average pit stop lead to a better finish?`);

            if (!plotData.length) {
                modalChart.html("<p>No pit stop data available for this race to plot.</p>");
                return;
            }

            drawPitstopScatterPlot(plotData, driverId, driverName);
        }

        function showLapTimeData() {
            const { driverId, raceId } = selected;
            if (!driverId) return alert("Please select a driver.");

            tooltip.style("display", "none");

            const driver = kaggleData.drivers.find(d => d.driverId === driverId);
            openModal(`Lap Time Performance: ${driver.fullName}`);

            const lapTimes = kaggleData.lapTimes.filter(d =>
                d.raceId === raceId && d.driverId === driverId
            ).sort((a,b) => a.lap - b.lap);

            clearModal();
            modalDescription.html(`This chart plots the driver's raw lap time <strong>(in milliseconds)</strong> for each lap of the race. 
                                    Lower values are better. This shows consistency and pace degradation.`);

            if (!lapTimes.length) {
                modalChart.html("<p>No lap time data available for this driver in this race.</p>");
                return;
            }

            drawLapTimeChart(lapTimes);
        }

        function showPositionData() {
            const { driverId, raceId } = selected;
            if (!driverId) return alert("Please select a driver.");

            tooltip.style("display", "none");

            const driver = kaggleData.drivers.find(d => d.driverId === driverId);
            openModal(`Race Position: ${driver.fullName}`);

            const lapData = kaggleData.lapTimes.filter(d =>
                d.raceId === raceId && d.driverId === driverId
            ).sort((a,b) => a.lap - b.lap);

            clearModal();
            modalDescription.html(`This chart shows the driver's <strong>position in the race</strong> at the end of each lap.`);

            if (!lapData.length) {
                modalChart.html("<p>No position data available for this driver in this race.</p>");
                return;
            }

            drawPositionChart(lapData);
        }

        // --- Chart Drawing Functions ---

        function drawPitstopScatterPlot(plotData, selectedDriverId, selectedDriverName) {
            const margin = { top: 40, right: 30, bottom: 50, left: 60 };
            const width = 600 - margin.left - margin.right;
            const height = 350 - margin.top - margin.bottom;

            const svg = modalChart.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleLinear()
                .domain([
                    d3.min(plotData, d => d.avgPitstopTime) * 0.9,
                    d3.max(plotData, d => d.avgPitstopTime) * 1.1
                ])
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain([d3.max(plotData, d => d.finalPosition) + 1, 0])
                .range([height, 0]);

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .append("text")
                .attr("fill", "#111")
                .attr("x", width / 2)
                .attr("y", 40)
                .style("text-anchor", "middle")
                .text("Average Pit Stop Time (seconds)");

            svg.append("g")
                .call(d3.axisLeft(y).ticks(10).tickFormat(d3.format("d")))
                .append("text")
                .attr("fill", "#111")
                .attr("transform", "rotate(-90)")
                .attr("y", -40)
                .attr("x", -height / 2)
                .style("text-anchor", "middle")
                .text("Final Race Position");

            svg.selectAll("circle")
                .data(plotData)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.avgPitstopTime))
                .attr("cy", d => y(d.finalPosition))
                .attr("r", 5)
                .style("fill", d => (d.driverId === selectedDriverId) ? "var(--red, #D40000)" : "#888")
                .style("opacity", 0.7)
                .style("stroke", "#111")
                .style("stroke-width", 0.5)
                .append("title")
                .text(d => `${d.driverName} (${d.teamName})\nPosition: ${d.finalPosition}\nAvg Pit Stop: ${d.avgPitstopTime.toFixed(2)}s`);

            const legend = d3.select(svg.node().parentNode)
                .append("g")
                .attr("transform", `translate(${margin.left}, 15)`);

            legend.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 5).style("fill", "var(--red, #D40000)");
            legend.append("text").attr("x", 10).attr("y", 0).text(selectedDriverName).style("font-size", "12px").attr("alignment-baseline", "middle");

            legend.append("circle").attr("cx", 180).attr("cy", 0).attr("r", 5).style("fill", "#888");
            legend.append("text").attr("x", 190).attr("y", 0).text("Other Drivers").style("font-size", "12px").attr("alignment-baseline", "middle");
        }

        function drawLapTimeChart(lapData) {
            const margin = { top: 20, right: 30, bottom: 40, left: 60 };
            const width = 600 - margin.left - margin.right;
            const height = 300 - margin.top - margin.bottom;

            const svg = modalChart.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleLinear()
                .domain(d3.extent(lapData, d => d.lap))
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain(d3.extent(lapData, d => d.milliseconds))
                .range([height, 0]);

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).ticks(10))
                .append("text")
                .attr("fill", "#111")
                .attr("x", width / 2)
                .attr("y", 35)
                .text("Lap Number");

            svg.append("g")
                .call(d3.axisLeft(y).tickFormat(d => `${d/1000}s`))
                .append("text")
                .attr("fill", "#111")
                .attr("transform", "rotate(-90)")
                .attr("y", -40)
                .attr("x", -height/2)
                .style("text-anchor", "middle")
                .text("Lap Time (ms)");

            svg.append("path")
                .datum(lapData)
                .attr("fill", "none")
                .attr("stroke", "var(--red, #D40000)")
                .attr("stroke-width", 2)
                .attr("d", d3.line()
                    .x(d => x(d.lap))
                    .y(d => y(d.milliseconds))
                );
        }

        function drawPositionChart(lapData) {
            const margin = { top: 20, right: 30, bottom: 40, left: 60 };
            const width = 600 - margin.left - margin.right;
            const height = 300 - margin.top - margin.bottom;

            const svg = modalChart.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleLinear()
                .domain(d3.extent(lapData, d => d.lap))
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain([d3.max(lapData, d => d.position) + 1, 0])
                .range([height, 0]);

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).ticks(10))
                .append("text")
                .attr("fill", "#111")
                .attr("x", width / 2)
                .attr("y", 35)
                .text("Lap Number");

            svg.append("g")
                .call(d3.axisLeft(y).ticks(10).tickFormat(d3.format("d")))
                .append("text")
                .attr("fill", "#111")
                .attr("transform", "rotate(-90)")
                .attr("y", -40)
                .attr("x", -height/2)
                .style("text-anchor", "middle")
                .text("Position");

            svg.append("path")
                .datum(lapData)
                .attr("fill", "none")
                .attr("stroke", "var(--red, #D40000)")
                .attr("stroke-width", 2)
                .attr("d", d3.line()
                    .x(d => x(d.lap))
                    .y(d => y(d.position))
                );
        }

        // --- Utility Functions ---

        function openModal(title) {
            modalTitle.text(title);
            modal.style("display", "block");
            clearModal();
            modalChart.html("<p>Loading data...</p>");
            modalDescription.html("");
            modalOvertakes.html("");
        }

        function closeModal() {
            modal.style("display", "none");
            clearModal();
        }

        function clearModal() {
            modalChart.html("");
            modalOvertakes.html("");
            modalDescription.html("");
        }

        function clearDropdowns(dropdowns) {
            dropdowns.forEach(dd => dd.html(""));
        }

        function clearInfo() {
            infoTeamName.text("–");
            infoDriverName.text("–");
        }
    }
});