document.addEventListener("DOMContentLoaded", function () {
    // global
    window.currentDriver = null;
    let raceVis = null;

    // modal elements
    const driverModal = document.getElementById("driverModal");
    const driverModalClose = document.getElementById("driverModalClose");

    // close modal
    driverModalClose.onclick = () => driverModal.style.display = "none";
    window.onclick = (e) => {
        if (e.target === driverModal) driverModal.style.display = "none";
    };


    window.onclick = (e) => {
        if (e.target === driverModal) {
            driverModal.style.display = "none";
        }
    };

    const DATA_PATH = "data/kaggle/";

    Promise.all([
        d3.csv(DATA_PATH + "races.csv", d3.autoType),
        d3.csv(DATA_PATH + "circuits.csv", d3.autoType)
    ]).then(([races, circuits]) => {

        const circuitSelect = document.getElementById("circuitSelect");

    // API hasn't been called yet, placeholder data
    const sampleYears = [2022, 2023, 2024];
    const sampleCircuits = ["Bahrain", "Monaco", "Silverstone", "Suzuka"];

    const driverInfo = {
        "Verstappen": {
            img: "images/default_driver.png",
            team: "Red Bull",
            wins: 61,
            podiums: 98,
            championships: 3,
            speedSeries: [180, 185, 182, 188],
            championshipsSeries: [0,1,2,3],
            crashSeries: [1,3,2,0],
            podiumSeries: [10,12,15,17]
        },
        "Leclerc": {
            img: "images/default_driver.png",
            team: "Ferrari",
            wins: 5,
            podiums: 35,
            championships: 0,
            speedSeries: [178, 179, 177, 181],
            championshipsSeries: [0,0,0,0],
            crashSeries: [2,1,0,2],
            podiumSeries: [5,7,12,14]
        },
        "Norris": {
            img: "images/default_driver.png",
            team: "McLaren",
            wins: 1,
            podiums: 15,
            championships: 0,
            speedSeries: [175, 177, 178, 180],
            championshipsSeries: [0,0,0,0],
            crashSeries: [1,2,1,0],
            podiumSeries: [2,4,6,8]
        },
        "Hamilton": {
            img: "images/default_driver.png",
            team: "Mercedes",
            wins: 103,
            podiums: 197,
            championships: 7,
            speedSeries: [170, 172, 169, 171],
            championshipsSeries: [1,2,3,4],
            crashSeries: [0,1,0,1],
            podiumSeries: [12,15,18,20]
        },
        "Sainz": {
            img: "images/default_driver.png",
            team: "Ferrari",
            wins: 3,
            podiums: 21,
            championships: 0,
            speedSeries: [174, 175, 173, 178],
            championshipsSeries: [0,0,0,0],
            crashSeries: [1,1,2,1],
            podiumSeries: [3,5,7,9]
        },
        "Piastri": {
            img: "images/default_driver.png",
            team: "McLaren",
            wins: 1,
            podiums: 6,
            championships: 0,
            speedSeries: [176, 177, 175, 179],
            championshipsSeries: [0,0,0,0],
            crashSeries: [1,0,1,1],
            podiumSeries: [1,2,4,6]
        },
        "Russell": {
            img: "images/default_driver.png",
            team: "Mercedes",
            wins: 1,
            podiums: 11,
            championships: 0,
            speedSeries: [171, 173, 172, 174],
            championshipsSeries: [0,0,0,0],
            crashSeries: [1,1,1,0],
            podiumSeries: [3,4,6,7]
        },
        "Perez": {
            img: "images/default_driver.png",
            team: "Red Bull",
            wins: 6,
            podiums: 35,
            championships: 0,
            speedSeries: [172, 174, 173, 175],
            championshipsSeries: [0,0,0,0],
            crashSeries: [2,2,1,1],
            podiumSeries: [4,5,7,8]
        },
        "Alonso": {
            img: "images/default_driver.png",
            team: "Aston Martin",
            wins: 32,
            podiums: 106,
            championships: 2,
            speedSeries: [169, 170, 168, 171],
            championshipsSeries: [1,2,2,2],
            crashSeries: [1,2,1,1],
            podiumSeries: [8,9,10,11]
        },
        "Gasly": {
            img: "images/default_driver.png",
            team: "Alpine",
            wins: 1,
            podiums: 4,
            championships: 0,
            speedSeries: [168, 170, 169, 171],
            championshipsSeries: [0,0,0,0],
            crashSeries: [2,1,2,1],
            podiumSeries: [1,2,3,4]
        }
    };

    // This makes the modal open/close properly

    driverModalClose.onclick = () => driverModal.style.display = "none";

    window.onclick = (e) => {
        if (e.target === driverModal) {
            driverModal.style.display = "none";
        }
    };

    
    const wantedCircuits = ["Bahrain", "Monaco", "Silverstone"];

    wantedCircuits.forEach(trackName => {

        // find matching circuit
        const circuit = circuits.find(c =>
            (c.circuitRef && c.circuitRef.toLowerCase() === trackName.toLowerCase()) ||
            (c.name && c.name.toLowerCase().includes(trackName.toLowerCase()))
        );

        if (!circuit) return;

        const circuitId = circuit.circuitId;

        // find all races for that circuit
        const racesForCircuit = races.filter(r => r.circuitId === circuitId);

        if (!racesForCircuit.length) return;

        const latestYear = d3.max(racesForCircuit, r => r.year);

        const opt = document.createElement("option");
        opt.value = trackName;
        opt.textContent = `${trackName} (${latestYear})`;
        circuitSelect.appendChild(opt);
    });


    circuitSelect.addEventListener("change", () => {
        console.log("Circuit selected:", circuitSelect.value);
        loadTrack();
    });

    // Event listeners for pause and play
    const playBtn = document.getElementById("playBtn");
    const pauseBtn = document.getElementById("pauseBtn");

    playBtn.addEventListener("click", () => {
        if (raceVis) raceVis.startAnimation();
    });

    pauseBtn.addEventListener("click", () => {
        if (raceVis) raceVis.stopAnimation();
    });

    //Load track
    function loadTrack() {
        // const year = yearSelect.value;
        const circuit = circuitSelect.value.toLowerCase(); 
        
        if (!circuit || !circuit) return; // return early if nothing selected
        
        d3.select(".awaitingText").style("display", "none"); 
        
        // clean up old vis 
        if (raceVis) {
            d3.select("#circuitContainer").selectAll("svg").remove(); 
        }
        
        // new vis
        raceVis = new novelTrackVis("#circuitContainer", circuit, {}, []); 
    }

    // Load driver Graph
    function loadDriverGraph(type, driver) {
        const info = driverInfo[driver];
        if (!info) return;

        // Clear previous graph
        const graph = d3.select("#driverGraphArea");
        graph.html("");

        // Pick the right dataset
        let data;
        if (type === "speed") data = info.speedSeries;
        if (type === "championships") data = info.championshipsSeries;
        if (type === "crashes") data = info.crashSeries;
        if (type === "podiums") data = info.podiumSeries;

        // Create SVG
        const svg = graph.append("svg")
            .attr("width", "100%")
            .attr("height", 300);

        const barWidth = 60;
        const barSpacing = 20;

        // Draw bars
        svg.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", (d, i) => i * (barWidth + barSpacing))
            .attr("y", d => 300 - d * 5)
            .attr("width", barWidth)
            .attr("height", d => d * 5)
            .attr("fill", "var(--red)");

        // Axis labels (optional)
        svg.selectAll("text")
            .data(data)
            .enter()
            .append("text")
            .text(d => d)
            .attr("x", (d, i) => i * (barWidth + barSpacing) + barWidth / 3)
            .attr("y", d => 300 - d * 5 - 10)
            .attr("fill", "#333")
            .attr("font-size", "12px");
    }
    // --- TAB BUTTONS FOR DRIVER MODAL ---

    // --- TAB BUTTONS FOR DRIVER MODAL ---
    document.querySelectorAll(".driver-tabs .tab").forEach(tab => {
        tab.addEventListener("click", () => {

            // remove active class from all tabs
            document.querySelectorAll(".driver-tabs .tab").forEach(t =>
                t.classList.remove("active")
            );

            // add active class to clicked tab
            tab.classList.add("active");

            // get tab type (speed, championships, crashes, podiums)
            const type = tab.dataset.tab;

            // load the corresponding graph
            loadDriverGraph(type, window.currentDriver);
        });
    });
});
// CLICK TO OPEN DRIVER MODAL
    document.getElementById("driverStatsBox").addEventListener("click", () => {

        if (!window.currentDriver) return;

        const info = driverInfo[window.currentDriver];
        if (!info) return;

        driverModal.style.display = "block";

        document.getElementById("driverModalName").textContent = window.currentDriver;
        document.getElementById("driverModalImg").src = info.img;
        document.getElementById("driverModalTeam").textContent = info.team;

        document.getElementById("driverSummary").innerHTML = `
        <strong>Wins:</strong> ${info.wins}<br>
        <strong>Podiums:</strong> ${info.podiums}<br>
        <strong>Championships:</strong> ${info.championships}
    `;

        loadDriverGraph("speed", window.currentDriver);
    });


});


class novelTrackVis {

    // constructor method to initialize object
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
        this.initVis();
    }

    startAnimation() {
        this.isPaused = false;
    }

    stopAnimation() {
        this.isPaused = true;
    }

    async loadRaceData() {
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

            // find the driver's constructor (team) using results.csv
            const resultEntry = results.find(r =>
                r.raceId === raceId && r.driverId === driverId
            );

            // default
            let team = "Unknown";

            // map constructor → team name
            if (resultEntry) {
                const constructorInfo = constructorById.get(resultEntry.constructorId);
                if (constructorInfo && constructorInfo.name) {
                    team = constructorInfo.name;
                }
            }

            // choose colour based on team
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
        
            // loading the svg 
            const trackSVG = await d3.xml(`tracks/${vis.trackName}.svg`);
            const svgNode = trackSVG.documentElement;

            // define coordinate system + aspect ratio of SVG content w/ viewbox 
            const viewBox = svgNode.getAttribute("viewBox");
            if (viewBox) {
                svgContainer.attr("viewBox", viewBox);
            }

            vis.svg = svgContainer.append("g")
                .attr("class", "track-layer");
            
            // add all elements of svg to vis
            Array.from(svgNode.children).forEach(child => {
                vis.svg.node().appendChild(child.cloneNode(true));
            });

            vis.trackPath = vis.svg.select("path.track");
            if (vis.trackPath.empty()) {
                vis.trackPath = vis.svg.select("path");
            }

            // path length for animation
            vis.pathLength = vis.trackPath.node().getTotalLength();

            // ---- LOAD REAL RACE / LAP / DRIVER DATA FOR THIS TRACK ----
            const dots = await vis.loadRaceData();

            if (!dots || dots.length === 0) {
                console.warn("No dots (drivers) created for this track.");
                return;
            }

            // Create one circle per driver
            const circles = vis.svg.selectAll(".race-dot")
                .data(dots)
                .enter()
                .append("circle")
                .attr("class", "race-dot")
                .attr("r", 8)
                .attr("fill", d => d.color);

            // Initialize all dots at the start of the track
            dots.forEach(d => {
                const point = vis.trackPath.node().getPointAtLength(0);
                d.x = point.x;
                d.y = point.y;
            });

            circles
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            // references to the driver stats fields
            const driverNameEl = document.getElementById("driverName");
            const speedEl = document.getElementById("speed");

            // tooltip div
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("padding", "6px 10px")
                .style("background", "#fff")
                .style("border", "1px solid #ccc")
                .style("border-radius", "5px")
                .style("font-family", "Antonio, sans-serif")
                .style("font-size", "0.9rem")
                .style("pointer-events", "none")
                .style("display", "none");

            // Hover + click behaviour: update tooltip + stats panel
            circles
                .on("mouseover", (event, d) => {
                    tooltip
                        .style("display", "block")
                        .text(d.driver);

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
                
                    // Extract surname for modal lookup
                    const surname = d.driver.split(" ").pop();
                    window.currentDriver = surname;
                
                    if (driverNameEl) {
                        driverNameEl.textContent = d.driver || "Unknown";
                    }
                    if (speedEl) {
                        const avgLapSeconds = d.avgLapMs
                            ? (d.avgLapMs / 1000).toFixed(3)
                            : "–";
                        speedEl.textContent = avgLapSeconds + " s (avg lap)";
                    }
                });

            // ---- D3 TIMER: MOVE DOTS ACCORDING TO REAL LAP TIMES ----
            vis.lastElapsed = 0;

            d3.timer((elapsed) => {
                if (vis.isPaused) {
                    // keep timer running but do not advance laps while paused
                    vis.lastElapsed = elapsed;
                    return;
                }

                // time step in ms, scaled by speedFactor (>1 = faster than real time)
                const delta = (elapsed - vis.lastElapsed) * vis.speedFactor;
                vis.lastElapsed = elapsed;

                dots.forEach(d => {
                    if (!d.laps || d.laps.length === 0) return;

                    d.lapElapsed += delta;

                    // advance through laps if we've exceeded current lap duration
                    while (d.lapElapsed > d.currentLap.milliseconds) {
                        d.lapElapsed -= d.currentLap.milliseconds;
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
                // Calculate each driver's distance along the track
                dots.forEach(d => {
                    d.distance = (d.currentLapIndex * vis.pathLength) + 
                                 (d.lapElapsed / d.currentLap.milliseconds) * vis.pathLength;
                });

                const ranking = dots
                    .slice()
                    .sort((a, b) => b.distance - a.distance)
                    .slice(0, 5);  // Show only top 5
                
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