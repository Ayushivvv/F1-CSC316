document.addEventListener("DOMContentLoaded", function () {
    // global
    window.currentDriverId = null;
    window.currentDriverName = "";
    let raceVis = null;

    // modal elements
    const driverModal = document.getElementById("driverModal");
    const driverModalClose = document.getElementById("driverModalClose");
    const DATA_PATH = "data/kaggle/";
    const driverStats = new Map();
    const driverStatsReady = loadDriverStats();

    // close modal
    driverModalClose.onclick = () => (driverModal.style.display = "none");
    window.onclick = (e) => {
        if (e.target === driverModal) {
            driverModal.style.display = "none";
        }
    };
    const driverTabs = document.querySelector(".driver-tabs");
    const driverGraphArea = document.getElementById("driverGraphArea");

    const GRAPH_CONFIG = {
        points: { key: "points", label: "Season Points", color: "var(--red)" },
        wins: { key: "wins", label: "Season Wins", color: "#f4a259" },
        podiums: { key: "podiums", label: "Season Podiums", color: "#5b8bf7" },
        races: { key: "races", label: "Race Starts", color: "#2b2d42" },
    };

    function formatPoints(value) {
        if (!Number.isFinite(value)) return "–";
        return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }

    async function loadDriverStats() {
        const [drivers, results, races, constructors] = await Promise.all([
            d3.csv(DATA_PATH + "drivers.csv", d3.autoType),
            d3.csv(DATA_PATH + "results.csv", d3.autoType),
            d3.csv(DATA_PATH + "races.csv", d3.autoType),
            d3.csv(DATA_PATH + "constructors.csv", d3.autoType),
        ]);

        const constructorById = new Map(constructors.map((c) => [c.constructorId, c]));
        const raceOrderById = new Map(
            races.map((race) => [
                race.raceId,
                (race.year || 0) * 1000 + (race.round || 0),
            ])
        );
        const raceYearById = new Map(races.map((race) => [race.raceId, race.year]));

        drivers.forEach((driver) => {
            driverStats.set(driver.driverId, {
                driverId: driver.driverId,
                name: `${driver.forename} ${driver.surname}`,
                surname: driver.surname,
                nationality: driver.nationality,
                dob: driver.dob,
                totalRaces: 0,
                wins: 0,
                podiums: 0,
                points: 0,
                latestTeam: null,
                latestSeason: null,
                latestRaceOrder: -Infinity,
                yearly: new Map(),
            });
        });

        results.forEach((result) => {
            const stat = driverStats.get(result.driverId);
            if (!stat) return;

            stat.totalRaces += 1;

            const positionNumeric = Number.isFinite(result.position)
                ? result.position
                : Number.isFinite(Number(result.positionText))
                ? Number(result.positionText)
                : null;

            if (positionNumeric === 1) {
                stat.wins += 1;
            }

            if (positionNumeric && positionNumeric <= 3) {
                stat.podiums += 1;
            }

            if (Number.isFinite(result.points)) {
                stat.points += result.points;
            }

            const raceYear = raceYearById.get(result.raceId);
            if (raceYear) {
                let yearly = stat.yearly.get(raceYear);
                if (!yearly) {
                    yearly = { year: raceYear, points: 0, wins: 0, podiums: 0, races: 0 };
                    stat.yearly.set(raceYear, yearly);
                }
                yearly.races += 1;
                yearly.points += Number.isFinite(result.points) ? result.points : 0;
                if (positionNumeric === 1) {
                    yearly.wins += 1;
                }
                if (positionNumeric && positionNumeric <= 3) {
                    yearly.podiums += 1;
                }
            }

            const raceOrder = raceOrderById.get(result.raceId) ?? -Infinity;
            if (raceOrder >= stat.latestRaceOrder) {
                stat.latestRaceOrder = raceOrder;
                const constructorInfo = constructorById.get(result.constructorId);
                stat.latestTeam = constructorInfo ? constructorInfo.name : null;
                stat.latestSeason = raceYearById.get(result.raceId) || null;
            }
        });
    }

    function buildSeries(stat, key) {
        if (!stat || !stat.yearly) return [];
        const entries = Array.from(stat.yearly.values());
        entries.sort((a, b) => a.year - b.year);
        return entries.map((d) => ({
            year: d.year,
            value: Number.isFinite(d[key]) ? d[key] : 0,
        }));
    }

    function loadDriverGraph(type, driverId) {
        if (!driverGraphArea) return;
        const stat = driverStats.get(driverId);
        if (!stat) return;
        const config = GRAPH_CONFIG[type];
        const graph = d3.select("#driverGraphArea");
        graph.html("");

        if (!config) {
            graph
                .append("p")
                .attr("class", "graph-placeholder")
                .text("No chart configuration found.");
            return;
        }

        const data = buildSeries(stat, config.key);
        if (!data.length) {
            graph
                .append("p")
                .attr("class", "graph-placeholder")
                .text("No season data available for this driver.");
            return;
        }

        const margin = { top: 25, right: 20, bottom: 45, left: 60 };
        const width = 520 - margin.left - margin.right;
        const height = 320 - margin.top - margin.bottom;

        const svg = graph
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3
            .scaleBand()
            .domain(data.map((d) => d.year))
            .range([0, width])
            .padding(0.25);

        const yMax = d3.max(data, (d) => d.value) || 1;
        const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([height, 0]);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat((d) => d.toString()))
            .selectAll("text")
            .style("font-family", "Antonio, sans-serif")
            .style("font-size", "12px");

        svg.append("g")
            .call(d3.axisLeft(yScale))
            .selectAll("text")
            .style("font-family", "Antonio, sans-serif")
            .style("font-size", "12px");

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .style("font-family", "Antonio, sans-serif")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text(config.label);

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 20)
            .attr("text-anchor", "middle")
            .style("font-family", "Antonio, sans-serif")
            .style("font-size", "12px")
            .text(config.label);

        svg.selectAll(".bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", (d) => xScale(d.year))
            .attr("y", (d) => yScale(d.value))
            .attr("width", xScale.bandwidth())
            .attr("height", (d) => height - yScale(d.value))
            .attr("fill", config.color);

        svg.selectAll(".bar-label")
            .data(data)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", (d) => xScale(d.year) + xScale.bandwidth() / 2)
            .attr("y", (d) => yScale(d.value) - 6)
            .attr("text-anchor", "middle")
            .style("font-family", "Antonio, sans-serif")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .text((d) => (Number.isInteger(d.value) ? d.value : d.value.toFixed(1)));
    }

    document.querySelectorAll(".driver-tabs .tab").forEach((tab) => {
        tab.addEventListener("click", async () => {
            document
                .querySelectorAll(".driver-tabs .tab")
                .forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");

            const type = tab.dataset.tab;
            if (window.currentDriverId && type) {
                await driverStatsReady;
                loadDriverGraph(type, window.currentDriverId);
            }
        });
    });

    async function showDriverModal() {
        if (!window.currentDriverId) return;

        await driverStatsReady;

        const info = driverStats.get(window.currentDriverId);
        if (!info) return;

        driverModal.style.display = "block";

        const modalName = document.getElementById("driverModalName");
        const modalImg = document.getElementById("driverModalImg");
        const modalTeam = document.getElementById("driverModalTeam");
        const driverSummary = document.getElementById("driverSummary");

        modalName.textContent = info.name || window.currentDriverName || "Driver";
        modalImg.src = "images/default_driver.png";

        if (driverTabs) {
            driverTabs.style.display = "flex";
        }
        if (driverGraphArea) {
            driverGraphArea.style.display = "block";
        }

        const teamParts = [];
        if (info.latestTeam) {
            teamParts.push(
                info.latestSeason
                    ? `${info.latestTeam} (${info.latestSeason})`
                    : info.latestTeam
            );
        }
        if (info.nationality) {
            teamParts.push(info.nationality);
        }
        modalTeam.textContent = teamParts.join(" • ") || "Details unavailable";

        driverSummary.innerHTML = `
        <strong>Race Starts:</strong> ${info.totalRaces || 0}<br>
        <strong>Wins:</strong> ${info.wins || 0}<br>
        <strong>Podiums:</strong> ${info.podiums || 0}<br>
        <strong>Career Points:</strong> ${formatPoints(info.points)}
    `;

        const tabs = document.querySelectorAll(".driver-tabs .tab");
        let defaultTabType = "points";
        tabs.forEach((tab, index) => {
            if (index === 0) {
                defaultTabType = tab.dataset.tab || defaultTabType;
            }
            tab.classList.toggle("active", index === 0);
        });

        loadDriverGraph(defaultTabType, window.currentDriverId);
    }
    window.showDriverModal = showDriverModal;

    document
        .getElementById("driverStatsBox")
        .addEventListener("click", showDriverModal);

    const circuitSelect = document.getElementById("circuitSelect");
    const playBtn = document.getElementById("playBtn");
    const pauseBtn = document.getElementById("pauseBtn");

    playBtn.addEventListener("click", () => {
        if (raceVis) raceVis.startAnimation();
    });

    pauseBtn.addEventListener("click", () => {
        if (raceVis) raceVis.stopAnimation();
    });

    function loadTrack() {
        const circuit = circuitSelect.value.toLowerCase();
        if (!circuit) return;

        d3.select(".awaitingText").style("display", "none");

        if (raceVis) {
            d3.select("#circuitContainer").selectAll("svg").remove();
        }

        raceVis = new novelTrackVis("#circuitContainer", circuit, {}, []);
    }

    Promise.all([
        d3.csv(DATA_PATH + "races.csv", d3.autoType),
        d3.csv(DATA_PATH + "circuits.csv", d3.autoType),
    ]).then(([races, circuits]) => {
        circuitSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Pick a track";
    placeholder.disabled = true;
    placeholder.selected = true;
    circuitSelect.appendChild(placeholder);


        const wantedCircuits = ["Bahrain", "Monaco", "Silverstone"];

        wantedCircuits.forEach((trackName) => {
            const circuit = circuits.find(
                (c) =>
                    (c.circuitRef &&
                        c.circuitRef.toLowerCase() === trackName.toLowerCase()) ||
                    (c.name &&
                        c.name
                            .toLowerCase()
                            .includes(trackName.toLowerCase()))
            );

            if (!circuit) return;

            const circuitId = circuit.circuitId;
            const racesForCircuit = races.filter(
                (r) => r.circuitId === circuitId
            );
            if (!racesForCircuit.length) return;

            const latestYear = d3.max(racesForCircuit, (r) => r.year);

            const opt = document.createElement("option");
            opt.value = trackName.toLowerCase();
            opt.textContent = `${trackName} (${latestYear})`;
            circuitSelect.appendChild(opt);
        });

        circuitSelect.addEventListener("change", () => {
            loadTrack();
        });
    });
});



class novelTrackVis {

    constructor(parentElement, trackName, lapData, driverList) {
        this.parentElement = parentElement;
        this.trackName = trackName;
        this.lapData = lapData;
        this.driverList = driverList;
        this.selectedDrivers = [];
        this.isPaused = true;
        this.currentTime = 0;
        this.lastElapsed = 0;
        this.speedFactor = 10.0;
        this.currentLap = 1;
        this.totalLaps = 0;
        this.completedLaps = 0;
        this.lapCounterEl = document.getElementById("lapCounter");
        if (this.lapCounterEl) {
            this.lapCounterEl.textContent = "Lap 0 / –";
        }
        this.initVis();
    }

    startAnimation() {
        this.isPaused = false;
    }

    stopAnimation() {
        this.isPaused = true;
    }

    async loadRaceData() {
        const vis = this;
        const dataPath = "data/kaggle/";

        const racesFile = dataPath + "races.csv";
        const lapsFile = dataPath + "lap_times.csv";
        const driversFile = dataPath + "drivers.csv";
        const circuitsFile = dataPath + "circuits.csv";
        const resultsFile = dataPath + "results.csv";  
        const constructorsFile = dataPath + "constructors.csv";  

        const [races,laps,drivers,circuits,results,constructors] = await Promise.all([
            d3.csv(racesFile, d3.autoType),
            d3.csv(lapsFile, d3.autoType),
            d3.csv(driversFile, d3.autoType),
            d3.csv(circuitsFile, d3.autoType),
            d3.csv(resultsFile, d3.autoType),
            d3.csv(constructorsFile, d3.autoType)
        ]);
        const constructorById = new Map(constructors.map(c => [c.constructorId, c]));

        const teamColours = {
            "Red Bull": "#FFFF00",
            "Ferrari": "#C92D4B",
            "Mercedes": "#6CD3BF",
            "McLaren": "#FF8000",
            "Aston Martin": "#358C75",
            "Alpine F1 Team": "#2293D1",
            "AlphaTauri": "#5E8FAA",
            "Williams": "#64C4FF",
            "Alfa Romeo": "#B6BABD",
            "Haas F1 Team": "#E80020",
            "Sauber": "#00E5FF"
        };        

        const circuitRef = this.trackName.toLowerCase();
        const circuitRow = circuits.find(c =>
            (c.circuitRef && c.circuitRef.toLowerCase() === circuitRef) ||
            (c.name && c.name.toLowerCase().includes(circuitRef))
        );

        if (!circuitRow) {
            console.warn("No circuit found in circuits.csv for track:", this.trackName);
            return [];
        }

        const circuitId = circuitRow.circuitId;

        const racesForCircuit = races.filter(r => r.circuitId === circuitId);
        if (!racesForCircuit.length) {
            console.warn("No races found for circuitId:", circuitId);
            return [];
        }

        const maxYear = d3.max(racesForCircuit, r => r.year);
        const latestRace = racesForCircuit.find(r => r.year === maxYear);
        const raceId = latestRace.raceId;

        const lapsForRace = laps.filter(l => l.raceId === raceId);

        if (!lapsForRace.length) {
            console.warn("No lap times found for raceId:", raceId);
            return [];
        }

        vis.totalLaps = d3.max(lapsForRace, d => d.lap) || 0;
        vis.completedLaps = 0;
        if (vis.lapCounterEl) {
            const totalText = vis.totalLaps > 0 ? vis.totalLaps : "–";
            vis.lapCounterEl.textContent = `Lap 0 / ${totalText}`;
        }

        const lapsByDriver = d3.group(lapsForRace, d => d.driverId);

        const driverById = new Map(drivers.map(d => [d.driverId, d]));

        const dots = [];

        lapsByDriver.forEach((driverLaps, driverId) => {
            driverLaps.sort((a, b) => d3.ascending(a.lap, b.lap));

            const driverInfo = driverById.get(driverId);
            const driverName = driverInfo
                ? `${driverInfo.forename} ${driverInfo.surname}`
                : `Driver ${driverId}`;

            const bestLapMs = d3.min(driverLaps, d => d.milliseconds);
            const avgLapMs = d3.mean(driverLaps, d => d.milliseconds);

            const resultEntry = results.find(r =>
                r.raceId === raceId && r.driverId === driverId
            );

            let team = "Unknown";

            if (resultEntry) {
                const constructorInfo = constructorById.get(resultEntry.constructorId);
                if (constructorInfo && constructorInfo.name) {
                    team = constructorInfo.name;
                }
            }

            const color = teamColours[team] || "#999999";

            dots.push({
                driverId: driverId,
                driver: driverName,
                team: team,
                color: color,
                laps: driverLaps,
                lapElapsed: 0,
                currentLapIndex: 0,
                currentLap: driverLaps[0],
                bestLapMs: bestLapMs,
                avgLapMs: avgLapMs,
                completedLaps: 0,
                x: 0,
                y: 0
            });
        });

        return dots;
    }    

    async initVis(){
        let vis = this;

        vis.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        vis.width = 700; 
        vis.height = 500; 

        d3.select(vis.parentElement).selectAll("svg").remove(); 

        let svgContainer = d3.select(vis.parentElement)
            .append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .style("background", "#f5f5f5");
        
            const trackSVG = await d3.xml(`tracks/${vis.trackName}.svg`);
            const svgNode = trackSVG.documentElement;

            const viewBox = svgNode.getAttribute("viewBox");
            if (viewBox) {
                svgContainer.attr("viewBox", viewBox);
            }

            vis.svg = svgContainer.append("g")
                .attr("class", "track-layer");
            
            Array.from(svgNode.children).forEach(child => {
                vis.svg.node().appendChild(child.cloneNode(true));
            });

            vis.trackPath = vis.svg.select("path.track");
            if (vis.trackPath.empty()) {
                vis.trackPath = vis.svg.select("path");
            }

            vis.pathLength = vis.trackPath.node().getTotalLength();

            const dots = await vis.loadRaceData();

            if (!dots || dots.length === 0) {
                console.warn("No dots (drivers) created for this track.");
                return;
            }

            const circles = vis.svg.selectAll(".race-dot")
                .data(dots)
                .enter()
                .append("circle")
                .attr("class", "race-dot")
                .attr("r", 8)
                .attr("fill", d => d.color);

            dots.forEach(d => {
                const point = vis.trackPath.node().getPointAtLength(0);
                d.x = point.x;
                d.y = point.y;
            });

            circles
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            const driverNameEl = document.getElementById("driverName");
            const speedEl = document.getElementById("speed");

            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("padding", "8px 12px")
                .style("background", "#fff")
                .style("border", "1px solid #ccc")
                .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)")
                .style("border-radius", "6px")
                .style("font-family", "Antonio, sans-serif")
                .style("font-size", "0.85rem")
                .style("line-height", "1.4")
                .style("pointer-events", "none")
                .style("display", "none");


            circles
                .on("mouseover", (event, d) => {
                    const lapNumber = (d.currentLapIndex || 0) + 1;
                    tooltip
                        .style("display", "block")
                        .html(`<strong>${d.driver}</strong><br>${d.team || "–"}<br>Lap ${lapNumber} of ${vis.totalLaps || "?"}`);

                    if (driverNameEl) {
                        driverNameEl.textContent = d.driver || "Unknown";
                    }
                    if (speedEl) {
                        const bestLapSeconds = d.bestLapMs
                            ? (d.bestLapMs / 1000).toFixed(3)
                            : "–";
                        speedEl.textContent = bestLapSeconds + " s (best lap)";
                    }
                })
                .on("mousemove", (event) => {
                    tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");
                })
                .on("mouseout", () => {
                    tooltip.style("display", "none");

                    if (!vis.selectedDriver && driverNameEl && speedEl) {
                        driverNameEl.textContent = "–";
                        speedEl.textContent = "–";
                    }
                })
                .on("click", (event, d) => {
                    vis.selectedDriver = d.driverId;
                
                    d3.selectAll(".race-dot").attr("stroke", "none");
                    d3.select(event.currentTarget)
                        .attr("stroke", "#d40000")
                        .attr("stroke-width", 3);
                
                    window.currentDriverId = d.driverId;
                    window.currentDriverName = d.driver;
                
                    if (driverNameEl) {
                        driverNameEl.textContent = d.driver || "Unknown";
                    }
                    if (speedEl) {
                        const avgLapSeconds = d.avgLapMs
                            ? (d.avgLapMs / 1000).toFixed(3)
                            : "–";
                        speedEl.textContent = avgLapSeconds + " s (avg lap)";
                    }

                    if (window.showDriverModal) {
                        window.showDriverModal();
                    }
                });

            vis.lastElapsed = 0;

            d3.timer((elapsed) => {
                if (vis.isPaused) {
                    // keep timer running but do not advance laps while paused
                    vis.lastElapsed = elapsed;
                    return;
                }

                const delta = (elapsed - vis.lastElapsed) * vis.speedFactor;
                vis.lastElapsed = elapsed;

                dots.forEach(d => {
                    if (!d.laps || d.laps.length === 0) return;

                    d.lapElapsed += delta;

                    while (d.lapElapsed > d.currentLap.milliseconds) {
                        d.lapElapsed -= d.currentLap.milliseconds;
                        d.completedLaps = (d.completedLaps || 0) + 1;
                        if (vis.totalLaps > 0) {
                            const capped = Math.min(d.completedLaps, vis.totalLaps);
                            if (capped > vis.completedLaps) {
                                vis.completedLaps = capped;
                                if (vis.lapCounterEl) {
                                    vis.lapCounterEl.textContent = `Lap ${vis.completedLaps} / ${vis.totalLaps}`;
                                }
                            }
                        } else if (vis.lapCounterEl) {
                            vis.lapCounterEl.textContent = `Lap ${d.completedLaps}`;
                        }
                        d.currentLapIndex = (d.currentLapIndex + 1) % d.laps.length;
                        d.currentLap = d.laps[d.currentLapIndex];
                    }

                    const progress = d.currentLap.milliseconds > 0
                        ? d.lapElapsed / d.currentLap.milliseconds
                        : 0;

                    const distance = progress * vis.pathLength;
                    const point = vis.trackPath.node().getPointAtLength(distance);
                    d.x = point.x;
                    d.y = point.y;
                });

                circles
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);

            // Update leaderboard
            const leaderboardList = document.getElementById("leaderboardList");
            if (leaderboardList) {
                dots.forEach(d => {
                    d.distance = (d.currentLapIndex * vis.pathLength) + 
                                 (d.lapElapsed / d.currentLap.milliseconds) * vis.pathLength;
                });

                const ranking = dots
                    .slice()
                    .sort((a, b) => b.distance - a.distance)
                    .slice(0, 5); 
                
                leaderboardList.innerHTML = "";
                ranking.forEach((d, idx) => {
                    const li = document.createElement("li");
                    li.textContent = d.driver;  
                    leaderboardList.appendChild(li);
                });
            }
        });
    }
}
