viz1();

function viz1() {
    // load the data 
    const DATA_PATH = "data/kaggle/";
    const CIRCUITS_FILE = DATA_PATH + "circuits.csv"
    const LAPTIMES_FILE = DATA_PATH + "lap_times.csv";
}

document.addEventListener("DOMContentLoaded", function () {
    // const yearSelect = document.getElementById("yearSelect");
    const circuitSelect = document.getElementById("circuitSelect");

    // API hasn't been called yet, placeholder data
    const sampleYears = [2022, 2023, 2024];
    const sampleCircuits = ["Bahrain", "Monaco", "Silverstone", "Suzuka"];

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

    let raceVis = null;

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
                // mark this driver as "selected"
                vis.selectedDriver = d.driver;

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
            });
            
    }}