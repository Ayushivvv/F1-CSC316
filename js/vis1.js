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
                    return colors[Math.floor(i / 2)]; // there are 2 cars (circles) of each colour
                })
            
            d3.timer(() => {
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