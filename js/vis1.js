viz1();

function viz1() {
    // load the data 
    const DATA_PATH = "data/kaggle/";
    const CIRCUITS_FILE = DATA_PATH + "circuits.csv"
    const LAPTIMES_FILE = DATA_PATH + "lap_times.csv";
}

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

    // const yearSelect = document.getElementById("yearSelect");
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


    // sampleYears.forEach(y => {
    //     const opt = document.createElement("option");
    //     opt.value = y;
    //     opt.textContent = y;
    //     yearSelect.appendChild(opt);
    // });

    sampleCircuits.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        circuitSelect.appendChild(opt);
    });


    // yearSelect.addEventListener("change", () => {
    //     console.log("Year selected:", yearSelect.value);
    //     loadTrack();
    // });

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
        this.speedFactor = 1.0;
        this.currentLap = 1;
        this.initVis();
    }

    startAnimation() {
        this.isPaused = false;
    }

    stopAnimation() {
        this.isPaused = true;
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

            vis.pathLength = vis.trackPath.node().getTotalLength(); // path length for animation
            
            const dots = [
                { distance: 0, speed: 0.5 },
                { distance: 0, speed: 0.6 },
                { distance: 0, speed: 0.7 },
                { distance: 0, speed: 0.8 },
                { distance: 0, speed: 0.9 },
                { distance: 0, speed: 1.0 },
                { distance: 0, speed: 1.1 },
                { distance: 0, speed: 1.2 },
                { distance: 0, speed: 1.3 },
                { distance: 0, speed: 1.4 },
                { distance: 0, speed: 1.5 },
                { distance: 0, speed: 1.6 },
                { distance: 0, speed: 1.7 },
                { distance: 0, speed: 1.8 },
                { distance: 0, speed: 1.9 },
                { distance: 0, speed: 2.0 },
                { distance: 0, speed: 2.1 },
                { distance: 0, speed: 2.2 },
                { distance: 0, speed: 2.4 },
                { distance: 0, speed: 2.5 }
            ];
            
            const circles = vis.svg.selectAll(".race-dot")
                .data(dots)
                .enter()
                .append("circle")
                .attr("class", "race-dot")
                .attr("r", 10)
                .attr("fill", (d, i) => {
                    const colors = [
                        "#5E8FAA",
                        "#B6BABD",
                        "#64C4FF",
                        "#2293D1",
                        "#C92D4B",
                        "#358C75",
                        "#FF8000",
                        "#3671C6",
                        "#6CD3BF",
                        "#E80020"
                      ];                      
                    return colors[Math.floor(i / 2)]; // there are 2 circles of each colour
                })

        // references to the driver stats fields
        const driverNameEl = document.getElementById("driverName");
        const speedEl = document.getElementById("speed");

        // handle hover + click
        circles
            .on("mouseover", (event, d) => {
                // show driver + speed when hovered
                driverNameEl.textContent = d.driver || "Unknown";
                speedEl.textContent = d.speed.toFixed(2) + "x";
            })
            .on("mouseout", () => {
                // if not selected, clear temporary hover info
                if (!vis.selectedDriver) {
                    driverNameEl.textContent = "–";
                    speedEl.textContent = "–";
                }
            })
            .on("click", (event, d) => {
                // hide the placeholder, show the stats
                document.getElementById("driverPlaceholder").style.display = "none";
                document.getElementById("driverStatsContent").style.display = "block";

                // mark this driver as "selected"
                vis.selectedDriver = d.driver;
                currentDriver = d.driver;

                // highlight this circle
                d3.selectAll(".race-dot").attr("stroke", "none");
                d3.select(event.currentTarget)
                    .attr("stroke", "#d40000")
                    .attr("stroke-width", 3);

                // update driver stats panel permanently
                driverNameEl.textContent = d.driver || "Unknown";
                speedEl.textContent = d.speed.toFixed(2) + "x";
            });

        // hover over driver circles - placeholder names
        const driverNames = [
            "Verstappen", "Leclerc", "Norris", "Hamilton", "Sainz",
            "Piastri", "Russell", "Perez", "Alonso", "Gasly"
        ];

        // attach driver name to each dot
        dots.forEach((d, i) => {
            d.driver = driverNames[i % driverNames.length];
        });

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

        // add hover behavior
        circles
            .on("mouseover", (event, d) => {
                tooltip.style("display", "block")
                    .text(d.driver);
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("display", "none");
            });


        d3.timer(() => {
                if (vis.isPaused) return; // skip updates while paused

                dots.forEach(dot => {
                    // move forward along the path
                    dot.distance += dot.speed;
                    
                    // use modulo to wrap, keeps going in same direction
                    const wrappedDistance = dot.distance % vis.pathLength;
                    
                    // get the point at this distance
                    const point = vis.trackPath.node().getPointAtLength(wrappedDistance);
                    dot.x = point.x;
                    dot.y = point.y;
                });
                
                circles
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);

            // Update leaderboard
            const leaderboardList = document.getElementById("leaderboardList");

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

            });}
}