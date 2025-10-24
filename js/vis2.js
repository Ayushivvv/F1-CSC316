// Save as js/vis2.js (REPLACE the old content with this)
document.addEventListener("DOMContentLoaded", function () {
    // Check if we are on the main page and viz2 exists
    if (!document.getElementById("viz2")) {
        return;
    }

    viz2();

    function viz2() {
        const API_URL = "https://api.openf1.org/v1";

        // --- DOM Selections ---
        const vizContainer = d3.select("#viz2");
        const carContainer = d3.select("#carContainer");
        const modal = d3.select("#viz2-modal");
        const modalTitle = d3.select("#modal-title");
        const modalChart = d3.select("#modal-chart");
        const modalOvertakes = d3.select("#modal-overtakes");
        const modalCloseBtn = d3.select(".close-btn");
        const modalDescription = d3.select("#modal-description"); // <-- NEW

        const yearSelect = d3.select("#viz2-yearSelect");
        const teamSelect = d3.select("#viz2-teamSelect");
        const driverSelect = d3.select("#viz2-driverSelect");

        const infoTeamName = d3.select("#info-teamName");
        const infoDriverName = d3.select("#info-driverName");

        // --- State ---
        let sessionData = {}; // To store drivers, session_key, etc.

        // --- D3 Scales & Colors ---
        const compoundColors = d3.scaleOrdinal()
            .domain(["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"])
            .range(["#D90000", "#FFD400", "#EFEFEF", "#00A651", "#00A9E0"]);

        // --- Initialization ---
        populateYears();
        loadSVG();

        // --- Event Listeners ---
        yearSelect.on("change", handleYearChange);
        teamSelect.on("change", handleTeamChange);
        driverSelect.on("change", handleDriverChange);
        modalCloseBtn.on("click", closeModal);

        // --- Data Loading Chain ---
        function populateYears() {
            const years = [2024, 2023]; // Add more as needed
            yearSelect.selectAll("option")
                .data(years)
                .enter()
                .append("option")
                .attr("value", d => d)
                .text(d => d);

            // Trigger the chain
            handleYearChange();
        }

        async function handleYearChange() {
            const year = yearSelect.property("value");
            console.log(`Year selected: ${year}`); // Debug
            clearDropdowns([teamSelect, driverSelect]);
            clearInfo();
            teamSelect.append("option").text("Loading teams..."); // Add loading text

            try {
                // 1. Find the first 'Race' session of the selected year.
                const raceSessions = await fetchData(`/sessions?year=${year}&session_name=Race`);
                if (!raceSessions.length) throw new Error(`No 'Race' sessions found for ${year}.`);

                // 2. Get the session_key and meeting_key from the *first* race.
                const firstRace = raceSessions[0]; // This is the first official race (e.g., Bahrain GP, not testing)
                const race_session_key = firstRace.session_key;
                const meeting_key = firstRace.meeting_key;
                console.log(`Found first race: meeting_key ${meeting_key}, race_session_key ${race_session_key}`); // Debug

                // 3. Get ALL sessions for that meeting to find a practice session.
                const allSessions = await fetchData(`/sessions?meeting_key=${meeting_key}`);
                if (!allSessions.length) throw new Error(`No sessions found for meeting ${meeting_key}.`);

                // 4. Find 'Practice 1' (most reliable) or any 'Practice' session to get the driver list
                const practiceSession = allSessions.find(s => s.session_name === 'Practice 1') || allSessions.find(s => s.session_type === 'Practice');
                if (!practiceSession) throw new Error("No practice session found for driver list.");
                const practice_session_key = practiceSession.session_key;
                console.log(`Found practice_session_key: ${practice_session_key}`); // Debug

                // 5. Get drivers using the practice key.
                const drivers = await fetchData(`/drivers?session_key=${practice_session_key}`);
                if (!drivers.length) throw new Error("Could not fetch driver list.");
                console.log(`Found ${drivers.length} drivers`); // Debug

                // 6. Store data (using the RACE key for charts).
                sessionData = {
                    session_key: race_session_key, // <-- IMPORTANT: Store the RACE key for charts
                    drivers: drivers,
                    allDrivers: drivers // Store a copy for overtake lookups
                };

                // 7. Populate Teams
                const teams = [...new Set(drivers.map(d => d.team_name))].filter(Boolean).sort(); // filter(Boolean) removes null/undefined

                clearDropdowns([teamSelect]); // Clear "Loading teams..."

                if (!teams.length) {
                    teamSelect.append("option").text("No teams found");
                    throw new Error("Driver list fetched but no teams found.");
                }

                teamSelect.selectAll("option")
                    .data(teams)
                    .enter()
                    .append("option")
                    .attr("value", d => d)
                    .text(d => d);

                // Trigger next step
                handleTeamChange();

            } catch (error) {
                console.error("Error loading year data:", error);
                clearDropdowns([teamSelect, driverSelect]);
                teamSelect.append("option").text("Error loading teams");
                infoTeamName.text("Error");
                infoDriverName.text(error.message.substring(0, 30) + "...");
            }
        }

        function handleTeamChange() {
            const teamName = teamSelect.property("value");
            clearDropdowns([driverSelect]);

            const driversForTeam = sessionData.drivers.filter(d => d.team_name === teamName);

            driverSelect.selectAll("option")
                .data(driversForTeam)
                .enter()
                .append("option")
                .attr("value", d => d.driver_number)
                .text(d => d.full_name);

            handleDriverChange();
        }

        function handleDriverChange() {
            const driverNumber = driverSelect.property("value");
            if (!driverNumber || !sessionData.drivers) {
                clearInfo();
                return;
            }

            const driver = sessionData.drivers.find(d => d.driver_number == driverNumber);

            if (driver) {
                infoTeamName.text(driver.team_name);
                infoDriverName.text(driver.full_name);
            }
        }

        // --- SVG Loading & Interaction ---
        function loadSVG() {
            d3.xml("images/f1-car.svg").then(data => {
                carContainer.html(""); // Clear "Loading Car..."

                const svgNode = data.documentElement;
                svgNode.id = "interactive-car-svg";
                carContainer.node().append(svgNode);

                const svg = d3.select(svgNode);

                svg.select("#clickable-tires")
                    .classed("interactive-part", true)
                    .on("click", showTireData);

                svg.select("#clickable-engine")
                    .classed("interactive-part", true)
                    .on("click", showEngineData);

                svg.select("#clickable-rear-wing")
                    .classed("interactive-part", true)
                    .on("click", showDrsData);
            }).catch(err => {
                console.error("Error loading SVG:", err);
                carContainer.html("<p>Error loading car SVG.</p>");
            });
        }

        // --- Click Handlers & Modal Functions ---

        function showTireData() {
            const driver_number = driverSelect.property("value");
            if (!driver_number) return alert("Please select a driver.");

            const driver = sessionData.drivers.find(d => d.driver_number == driver_number);
            openModal(`Tyre Strategy & Pit Stops: ${driver.full_name}`); // Sets "Loading..."

            Promise.all([
                fetchData(`/stints?session_key=${sessionData.session_key}&driver_number=${driver_number}`),
                fetchData(`/pit?session_key=${sessionData.session_key}&driver_number=${driver_number}`)
            ]).then(([stints, pits]) => {

                clearModal(); // <-- FIX: Clear "Loading..." text

                // === ADD DESCRIPTION ===
                modalDescription.html(`This chart shows the driver's tyre strategy. Each bar is a "stint," or period of driving. 
                                        The bar's color shows the tyre compound (Soft, Medium, etc.), and its length shows how many laps they drove on it. 
                                        The <strong>magenta dots</strong> mark when a pit stop occurred.`);

                if (!stints.length) {
                    modalChart.html("<p>No stint data available for this driver.</p>");
                    return;
                }

                drawStintChart(stints, pits);
            }).catch(error => {
                clearModal();
                console.error("Error fetching tire data:", error);
                modalChart.html("<p>Could not load tire data.</p>");
            });
        }

        function showEngineData() {
            const driver_number = driverSelect.property("value");
            if (!driver_number) return alert("Please select a driver.");

            const driver = sessionData.drivers.find(d => d.driver_number == driver_number);
            openModal(`Engine Performance (Speed Trap): ${driver.full_name}`); // Sets "Loading..."

            fetchData(`/laps?session_key=${sessionData.session_key}&driver_number=${driver_number}`)
                .then(laps => {

                    clearModal(); // <-- FIX: Clear "Loading..." text

                    // === ADD DESCRIPTION ===
                    modalDescription.html(`This chart plots the driver's raw speed performance over the race. 
                                        It shows the <strong>Speed Trap (st_speed)</strong> in km/h for each lap. 
                                        The Speed Trap is the point on the track where cars reach their highest speed, 
                                        making this a good measure of engine power and setup.`);

                    if (!laps.length) {
                        modalChart.html("<p>No lap data available for this driver.</p>");
                        return;
                    }
                    const speedData = laps.filter(d => d.st_speed > 0)
                        .sort((a,b) => a.lap_number - b.lap_number);

                    if (!speedData.length) {
                        modalChart.html("<p>No speed trap data found for this driver in this session.</p>");
                        return;
                    }
                    drawEngineChart(speedData);
                }).catch(error => {
                clearModal();
                console.error("Error fetching engine data:", error);
                modalChart.html("<p>Could not load engine data.</p>");
            });
        }

        function showDrsData() {
            const driver_number = driverSelect.property("value");
            if (!driver_number) return alert("Please select a driver.");

            const driver = sessionData.drivers.find(d => d.driver_number == driver_number);
            openModal(`DRS Usage & Overtakes: ${driver.full_name}`); // Sets "Loading..."

            Promise.all([
                fetchData(`/car_data?session_key=${sessionData.session_key}&driver_number=${driver_number}&drs>=10`),
                fetchData(`/overtakes?session_key=${sessionData.session_key}&overtaking_driver_number=${driver_number}`),
                fetchData(`/laps?session_key=${sessionData.session_key}&driver_number=${driver_number}`)
            ]).then(([drsData, overtakes, laps]) => {

                clearModal(); // <-- FIX: Clear "Loading..." text

                // === ADD DESCRIPTION ===
                modalDescription.html(`This shows two key stats: <strong>DRS (Drag Reduction System)</strong> usage and overtakes. 
                                        The pie chart shows the percentage of race laps where the driver activated DRS. 
                                        The list shows all overtakes recorded for this driver.`);

                const totalLaps = laps.length;
                if (totalLaps === 0) {
                    modalChart.html("<p>No lap data available to calculate DRS usage.</p>");
                    drawOvertakeList(overtakes);
                    return;
                }

                const drsLaps = new Set(drsData.map(d => d.lap_number)).size;
                const noDrsLaps = totalLaps - drsLaps;
                const pieData = [
                    { label: "Laps with DRS", value: drsLaps },
                    { label: "Laps without DRS", value: noDrsLaps }
                ];

                drawDrsPieChart(pieData);
                drawOvertakeList(overtakes);

            }).catch(error => {
                clearModal();
                console.error("Error fetching DRS data:", error);
                modalChart.html("<p>Could not load DRS data.</p>");
            });
        }

        // --- Chart Drawing Functions ---

        function drawStintChart(stints, pits) {
            const margin = { top: 20, right: 30, bottom: 40, left: 100 };
            const width = 600 - margin.left - margin.right;
            const height = 300 - margin.top - margin.bottom;

            const svg = modalChart.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const maxLaps = d3.max(stints, d => d.lap_end);

            const x = d3.scaleLinear()
                .domain([0, maxLaps])
                .range([0, width]);

            const y = d3.scaleBand()
                .domain(stints.map(d => `Stint ${d.stint_number}`))
                .range([0, height])
                .padding(0.2);

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).ticks(10))
                .append("text")
                .attr("fill", "#111")
                .attr("x", width / 2)
                .attr("y", 35)
                .text("Lap Number");

            svg.append("g")
                .call(d3.axisLeft(y));

            svg.selectAll("stintBars")
                .data(stints)
                .enter()
                .append("rect")
                .attr("x", d => x(d.lap_start))
                .attr("y", d => y(`Stint ${d.stint_number}`))
                .attr("width", d => x(d.lap_end) - x(d.lap_start))
                .attr("height", y.bandwidth())
                .style("fill", d => compoundColors(d.compound))
                .style("stroke", "#111")
                .style("stroke-width", 1);

            svg.selectAll("pitMarkers")
                .data(pits)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.lap_number))
                .attr("cy", d => {
                    const stint = stints.find(s => d.lap_number >= s.lap_start && d.lap_number <= s.lap_end);
                    const stintName = stint ? `Stint ${stint.stint_number}` : y.domain()[0];
                    return y(stintName) + y.bandwidth() / 2;
                })
                .attr("r", 5)
                .style("fill", "magenta")
                .style("stroke", "#111");
        }

        function drawEngineChart(speedData) {
            const margin = { top: 20, right: 30, bottom: 40, left: 60 };
            const width = 600 - margin.left - margin.right;
            const height = 300 - margin.top - margin.bottom;

            const svg = modalChart.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleLinear()
                .domain(d3.extent(speedData, d => d.lap_number))
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain([d3.min(speedData, d => d.st_speed) - 5, d3.max(speedData, d => d.st_speed) + 5])
                .range([height, 0]);

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .append("text")
                .attr("fill", "#111")
                .attr("x", width / 2)
                .attr("y", 35)
                .text("Lap Number");

            svg.append("g")
                .call(d3.axisLeft(y))
                .append("text")
                .attr("fill", "#111")
                .attr("transform", "rotate(-90)")
                .attr("y", -40)
                .attr("x", -height/2)
                .style("text-anchor", "middle")
                .text("Speed Trap (km/h)");

            svg.append("path")
                .datum(speedData)
                .attr("fill", "none")
                .attr("stroke", "var(--red, #D40000)")
                .attr("stroke-width", 2)
                .attr("d", d3.line()
                    .x(d => x(d.lap_number))
                    .y(d => y(d.st_speed))
                );
        }

        // ======================================================
        // === UPDATED PIE CHART FUNCTION ===
        // ======================================================
        function drawDrsPieChart(pieData) {
            const width = 450; // Increased width
            const height = 300;
            const margin = 40; // Margin for labels
            const radius = Math.min(width, height) / 2 - margin;

            const svg = modalChart.append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("class", "pie-chart-svg") // Add class for styling
                .append("g")
                .attr("transform", `translate(${width / 2},${height / 2})`);

            const color = d3.scaleOrdinal()
                .domain(pieData.map(d => d.label))
                .range(["#00A651", "#EFEFEF"]); // Green for DRS, light gray for no

            const pie = d3.pie()
                .value(d => d.value)
                .sort(null); // Do not sort slices

            const arc = d3.arc()
                .innerRadius(0)
                .outerRadius(radius);

            const outerArc = d3.arc()
                .innerRadius(radius + 10) // 10px outside
                .outerRadius(radius + 10);

            const arcs = svg.selectAll("arc")
                .data(pie(pieData))
                .enter()
                .append("g")
                .attr("class", "arc");

            // Draw slices
            arcs.append("path")
                .attr("fill", (d, i) => color(d.data.label))
                .attr("d", arc)
                .style("stroke", "#111")
                .style("stroke-width", "1px");

            // --- New Label Code ---

            // Add polylines
            svg.selectAll('allPolylines')
                .data(pie(pieData))
                .enter()
                .append('polyline')
                .attr('stroke', '#111')
                .style('fill', 'none')
                .attr('stroke-width', 1)
                .attr('points', d => {
                    const posA = arc.centroid(d);
                    const posB = outerArc.centroid(d);
                    const posC = outerArc.centroid(d);
                    posC[0] = (radius + 20) * (midAngle(d) < Math.PI ? 1 : -1); // extend line
                    return [posA, posB, posC];
                });

            // Add text labels
            svg.selectAll('allLabels')
                .data(pie(pieData))
                .enter()
                .append('text')
                .text(d => `${d.data.label} (${d.data.value})`)
                .attr('transform', d => {
                    const pos = outerArc.centroid(d);
                    pos[0] = (radius + 25) * (midAngle(d) < Math.PI ? 1 : -1); // Position text
                    return `translate(${pos})`;
                })
                .style('text-anchor', d => {
                    return (midAngle(d) < Math.PI ? 'start' : 'end');
                });

            function midAngle(d) {
                return d.startAngle + (d.endAngle - d.startAngle) / 2;
            }
        }
        // ======================================================
        // === END OF UPDATED FUNCTION ===
        // ======================================================

        function drawOvertakeList(overtakes) {
            const driverMap = new Map(sessionData.allDrivers.map(d => [d.driver_number, d.name_acronym]));

            modalOvertakes.html("<h4>Overtakes Made:</h4>");

            if (!overtakes.length) {
                modalOvertakes.append("p").text("No overtakes recorded.");
                return;
            }

            const list = modalOvertakes.append("ul");
            overtakes.forEach(o => {
                const overtakenDriverName = driverMap.get(o.overtaken_driver_number) || `Driver ${o.overtaken_driver_number}`;
                list.append("li")
                    .text(`Passed ${overtakenDriverName} for P${o.position}`);
            });
        }

        // --- Utility Functions ---
        async function fetchData(endpoint) {
            const response = await fetch(API_URL + endpoint);
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status} for ${endpoint}`);
            }
            return await response.json();
        }

        function openModal(title) {
            modalTitle.text(title);
            modal.style("display", "block");
            clearModal();
            // Set loading text in *all* containers that will be cleared
            modalChart.html("<p>Loading data...</p>");
            modalDescription.html("");
            modalOvertakes.html("");
        }

        function closeModal() {
            modal.style("display", "none");
            clearModal();
        }

        // UPDATE clearModal to clear description
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