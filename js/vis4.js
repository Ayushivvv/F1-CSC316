// js/vis4.js
viz4();

function viz4() {
    // Slightly narrower so it fits inside the viz card nicely
    const WIDTH = 930;
    const HEIGHT = 520;

    let SESSION_CONFIG = [];
    let currentData = null;
    let currentCarHeight = 24;

    const root = d3.select("#viz3");
    if (root.empty()) return;

    root.text(""); // clear placeholder

    // ==========================================
    // Layout
    // ==========================================
    const container = root.append("div")
        .attr("class", "viz3-container")
        .style("flex-direction", "column")
        // center everything in this viz block
        .style("align-items", "center");

    // ----- Top controls bar -----
    const controls = container.append("div")
        .attr("id", "viz3-controls")
        .style("flex-direction", "row")
        .style("align-items", "center")
        .style("justify-content", "space-between")
        .style("gap", "1.5rem")
        .style("margin-bottom", "1.5rem")
        .style("width", "100%");

    const textBlock = controls.append("div")
        .style("flex", "1")
        .style("text-align", "center");

    textBlock.append("h3")
        .text("Grid to Finish")
        .style("font-family", "Orbitron, sans-serif")
        .style("color", "var(--red)")
        .style("margin-top", "0");

    textBlock.append("p")
        .text("Pick a season and circuit to see how drivers moved from their starting grid slot on the right to their final result on the right.")
        .style("font-family", "Titillium Web, sans-serif")
        .style("font-size", "0.9rem")
        .style("margin-top", "0");

    const selectsBlock = controls.append("div")
        .style("display", "flex")
        .style("gap", "0.75rem");

    const yearGroup = selectsBlock.append("div")
        .attr("class", "selectGroup");

    yearGroup.append("label")
        .attr("for", "viz3-yearSelect")
        .text("Year");

    const yearSelect = yearGroup.append("select")
        .attr("id", "viz3-yearSelect");

    const circuitGroup = selectsBlock.append("div")
        .attr("class", "selectGroup");

    circuitGroup.append("label")
        .attr("for", "viz3-circuitSelect")
        .text("Circuit");

    const circuitSelect = circuitGroup.append("select")
        .attr("id", "viz3-circuitSelect");

    circuitSelect.append("option").text("Select a circuit");

    const buttonBlock = controls.append("div")
        .style("display", "flex")
        .style("gap", "0.5rem");

    const runBtn = buttonBlock.append("button")
        .attr("id", "viz3-runBtn")
        .text("▶ Run")
        .style("background", "var(--black)")
        .style("color", "#fff")
        .style("border", "none")
        .style("padding", "0.5rem 1rem")
        .style("border-radius", "5px")
        .style("cursor", "pointer")
        .style("font-weight", "600");

    const replayBtn = buttonBlock.append("button")
        .attr("id", "viz3-replayBtn")
        .text("⟳ Replay")
        .style("background", "var(--black)")
        .style("color", "#fff")
        .style("border", "none")
        .style("padding", "0.5rem 1rem")
        .style("border-radius", "5px")
        .style("cursor", "pointer")
        .style("font-weight", "600");

    function styleButtonHover(sel) {
        sel.on("mouseover", function () {
            d3.select(this).style("background", "var(--red)");
        }).on("mouseout", function () {
            d3.select(this).style("background", "var(--black)");
        });
    }
    styleButtonHover(runBtn);
    styleButtonHover(replayBtn);

    // ----- Track SVG -----
    const trackContainer = container.append("div")
        .attr("id", "viz3-trackContainer");

    const svg = trackContainer.append("svg")
        .attr("id", "viz3-svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .style("background", "#111");

    // ----- Legend -----
    const legendWrapper = container.append("div")
        .style("margin-top", "1rem")
        .style("width", "100%")
        .style("text-align", "center");

    legendWrapper.append("h4")
        .text("Teams")
        .style("font-family", "Orbitron, sans-serif")
        .style("color", "var(--red)")
        .style("margin", "0 0 0.25rem 0");

    const legendContainer = legendWrapper.append("div")
        .attr("id", "teamLegend");

    // Tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip");

    function normalizeColor(c) {
        if (!c) return "#666666";
        let s = String(c).trim();
        if (!s.startsWith("#")) s = "#" + s;
        return s;
    }

    // choose text color (black on light cars, white on dark cars)
    function textColorFor(bg) {
        let hex = bg.replace("#", "");
        if (hex.length === 3) {
            hex = hex.split("").map(ch => ch + ch).join("");
        }
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return L > 0.6 ? "#000000" : "#ffffff";
    }

    // ==========================================
    // Load sessions index
    // ==========================================
    d3.json("data/fastf1_data/sessions_index.json").then(sessions => {
        if (!Array.isArray(sessions) || sessions.length === 0) {
            svg.append("text")
                .attr("x", WIDTH / 2)
                .attr("y", HEIGHT / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#999")
                .style("font-family", "Orbitron, sans-serif")
                .style("font-size", "18px")
                .text("No session index found.");
            return;
        }

        SESSION_CONFIG = sessions;
        const years = Array.from(new Set(SESSION_CONFIG.map(d => d.year))).sort((a, b) => a - b);

        yearSelect.selectAll("option").remove();
        yearSelect.append("option").text("Select a year");
        yearSelect.selectAll("option.year-option")
            .data(years)
            .join("option")
            .attr("class", "year-option")
            .attr("value", d => d)
            .text(d => d);

        yearSelect.on("change", handleYearChange);
        circuitSelect.on("change", handleCircuitChange);

        runBtn.on("click", () => { if (currentData) animateRace(); });
        replayBtn.on("click", () => { if (currentData) animateRace(); });
    }).catch(err => {
        console.error("Could not load sessions_index.json:", err);
        svg.append("text")
            .attr("x", WIDTH / 2)
            .attr("y", HEIGHT / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .style("font-family", "Orbitron, sans-serif")
            .style("font-size", "18px")
            .text("Failed to load session index.");
    });

    // ==========================================
    // Dropdown helpers
    // ==========================================
    function handleYearChange() {
        const yearVal = +yearSelect.node().value;
        const circuits = SESSION_CONFIG.filter(d => d.year === yearVal);

        circuitSelect.selectAll("option").remove();
        circuitSelect.append("option").text("Select a circuit");

        circuitSelect.selectAll("option.circuit-option")
            .data(circuits, d => d.gp + d.year)
            .join("option")
            .attr("class", "circuit-option")
            .attr("value", d => d.gp)
            .text(d => d.label);

        svg.selectAll("*").remove();
        legendContainer.selectAll("*").remove();
        currentData = null;
    }

    function handleCircuitChange() {
        const session = getCurrentSession();
        if (session) loadAndRender(session);
    }

    function getCurrentSession() {
        const yearVal = +yearSelect.node().value;
        const gpVal = circuitSelect.node().value;
        if (!yearVal || !gpVal || gpVal === "Select a circuit") return null;
        return SESSION_CONFIG.find(d => d.year === yearVal && d.gp === gpVal);
    }

    // ==========================================
    // Data loading
    // ==========================================
    function loadAndRender(session) {
        d3.json(session.file).then(data => {
            if (!Array.isArray(data)) {
                console.error("Race JSON is not an array", data);
                return;
            }
            currentData = data;
            renderRace(data);
        }).catch(err => console.error("Error loading race file:", err));
    }

    // ==========================================
    // Static rendering (no animation)
    // ==========================================
    function renderRace(rawData) {
        svg.selectAll("*").remove();

        const data = rawData.map(d => {
            const grid = d.GridPosition != null ? +d.GridPosition : NaN;
            const pos = d.Position != null ? +d.Position : NaN;

            let delta = null;
            let label = "DNF";

            const hasPos = !Number.isNaN(pos);
            const hasGrid = !Number.isNaN(grid);

            const status = (d.Status || "").toString();
            const statusLower = status.toLowerCase();

            const isDnf =
                !hasPos ||
                (status &&
                    statusLower !== "finished" &&
                    !statusLower.startsWith("+"));

            let outcomeType = "finish"; // "finish" | "dnf" | "retired"
            if (isDnf) {
                if (statusLower.includes("retired")) {
                    outcomeType = "retired";
                    label = "RET";
                } else {
                    outcomeType = "dnf";
                    label = "DNF";
                }
            }

            if (!isDnf && hasPos && hasGrid) {
                delta = grid - pos; // gained spots
                if (delta > 0) label = `+${delta}`;
                else if (delta < 0) label = `${delta}`;
                else label = "0";
            }

            const teamColor = normalizeColor(d.TeamColor);
            const textColor = textColorFor(teamColor);

            return {
                Abbreviation: d.Abbreviation,
                FullName: d.FullName || d.Abbreviation,
                TeamName: d.TeamName || "",
                TeamColor: teamColor,
                TextColor: textColor,
                GridPosition: grid,
                Position: hasPos ? pos : null,
                Status: status || "Unknown",
                Time: d.Time || null,
                Points: d.Points != null ? +d.Points : null,
                HeadshotUrl: d.HeadshotUrl || null,
                delta,
                changeLabel: label,
                outcomeType
            };
        });

        const validDrivers = data.filter(d => !Number.isNaN(d.GridPosition));
        if (!validDrivers.length) {
            svg.append("text")
                .attr("x", WIDTH / 2)
                .attr("y", HEIGHT / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#999")
                .style("font-family", "Orbitron, sans-serif")
                .style("font-size", "18px")
                .text("No grid data available for this session.");
            return;
        }

        const finishers = validDrivers.filter(d => d.outcomeType === "finish");
        const nonFinishers = validDrivers.filter(d => d.outcomeType !== "finish");

        // ----- handle special grid positions (0 / pit lane) so nothing stacks -----
        const maxPositiveGrid = d3.max(validDrivers, d => d.GridPosition > 0 ? d.GridPosition : 0);
        const specialStarters = validDrivers.filter(d => d.GridPosition <= 0);
        const maxGridDomain = maxPositiveGrid + specialStarters.length;

        const maxPos = finishers.length ? d3.max(finishers, d => d.Position) : maxPositiveGrid;

        // both grids: P1 on the RIGHT (range reversed)
        const startScale = d3.scaleBand()
            .domain(d3.range(1, maxGridDomain + 1).map(String))
            .range([WIDTH - 80, 80])   // right -> left
            .padding(0.2);

        const totalSlots = maxPos + nonFinishers.length;
        const finishScale = d3.scaleBand()
            .domain(d3.range(1, totalSlots + 1).map(String))
            .range([WIDTH - 80, 80])   // right -> left
            .padding(0.2);

        const startY = 150;
        const finishY = 340;

        // assign finish slots: 1..maxPos for finishers, then DNFs/RET appended on the far left
        let extraFinishIndex = 1;
        let extraStartIndex = 1;

        validDrivers.forEach(d => {
            let effectiveGrid;
            if (d.GridPosition > 0) {
                effectiveGrid = d.GridPosition;
            } else {
                effectiveGrid = maxPositiveGrid + extraStartIndex;
                extraStartIndex += 1;
            }

            d.startX = startScale(String(effectiveGrid)) || startScale.range()[1];
            d.startY = startY;

            if (d.outcomeType === "finish" && d.Position != null) {
                d.finishSlot = d.Position;
            } else {
                d.finishSlot = maxPos + extraFinishIndex;
                extraFinishIndex += 1;
            }
            d.finalX = finishScale(String(d.finishSlot)) || finishScale.range()[1];
            d.finalY = finishY;
        });

        const carWidth = Math.max(32, startScale.bandwidth() * 0.85);
        const carHeight = 24;
        currentCarHeight = carHeight;

        // track: tall and with a bit more margin so no car hangs off
        const leftMargin = 40;
        const rightMargin = 40;
        const outerTrackWidth = WIDTH - leftMargin - rightMargin;
        const trackX1 = leftMargin;
        const trackX2 = WIDTH - rightMargin;
        const trackHeight = 80;
        const trackStroke = "#444";

        svg.append("rect")
            .attr("x", trackX1)
            .attr("y", startY - trackHeight / 2)
            .attr("width", outerTrackWidth)
            .attr("height", trackHeight)
            .attr("rx", trackHeight / 2)
            .attr("fill", "#222")
            .attr("stroke", trackStroke)
            .attr("stroke-width", 2);

        svg.append("rect")
            .attr("x", trackX1)
            .attr("y", finishY - trackHeight / 2)
            .attr("width", outerTrackWidth)
            .attr("height", trackHeight)
            .attr("rx", trackHeight / 2)
            .attr("fill", "#222")
            .attr("stroke", trackStroke)
            .attr("stroke-width", 2);

        // ----- Chequered borders ABOVE + BELOW each track -----
        const red = "#d40000";
        const cream = "#f9f5f0";

        function drawChequeredStrip(y, x1, x2) {
            const tileW = 20;
            let idx = 0;
            for (let x = x1; x < x2; x += tileW) {
                svg.append("rect")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("width", tileW)
                    .attr("height", 10)
                    .attr("fill", idx % 2 === 0 ? red : cream);
                idx += 1;
            }
        }

        const topStripOffset = trackHeight / 2 + 6;
        const bottomStripOffset = trackHeight / 2 - 6;

        drawChequeredStrip(startY - topStripOffset, trackX1, trackX2);    // above start
        drawChequeredStrip(startY + bottomStripOffset, trackX1, trackX2); // below start
        drawChequeredStrip(finishY - topStripOffset, trackX1, trackX2);   // above finish
        drawChequeredStrip(finishY + bottomStripOffset, trackX1, trackX2);// below finish

        // ----- Labels -----
        svg.append("text")
            .attr("x", WIDTH / 2)
            .attr("y", 55)
            .attr("text-anchor", "middle")
            .attr("fill", "#f9f5f0")
            .style("font-family", "Orbitron, sans-serif")
            .style("font-size", "20px")
            .text("Position Changes");

        svg.append("text")
            .attr("x", trackX2)
            .attr("y", startY - topStripOffset - 8)
            .attr("text-anchor", "end")
            .attr("fill", "#f9f5f0")
            .style("font-family", "Orbitron, sans-serif")
            .style("font-size", "12px")
            .text("Starting Grid (P1 on right)");

        svg.append("text")
            .attr("x", trackX2)
            .attr("y", finishY - topStripOffset - 8)
            .attr("text-anchor", "end")
            .attr("fill", "#f9f5f0")
            .style("font-family", "Orbitron, sans-serif")
            .style("font-size", "12px")
            .text("Finishing Positions (P1 on right, DNFs/RET at far left)");

        // ----- Cars -----
        const cars = svg.selectAll(".driver-car")
            .data(validDrivers, d => d.Abbreviation)
            .join("g")
            .attr("class", "driver-car")
            .attr("transform", d => `translate(${d.startX}, ${d.startY})`)
            .style("cursor", "pointer");

        cars.append("rect")
            .attr("x", -carWidth / 2)
            .attr("y", -carHeight / 2)
            .attr("width", carWidth)
            .attr("height", carHeight)
            .attr("rx", 6)
            .attr("fill", d => d.TeamColor)
            .attr("stroke", "#f9f5f0")
            .attr("stroke-width", 1.6);

        const wheelOffsetX = carWidth / 2 - 5;
        const wheelOffsetY = carHeight / 2 + 4;

        cars.append("circle")
            .attr("cx", -wheelOffsetX)
            .attr("cy", -wheelOffsetY)
            .attr("r", 2.8)
            .attr("fill", "#000");

        cars.append("circle")
            .attr("cx", wheelOffsetX)
            .attr("cy", -wheelOffsetY)
            .attr("r", 2.8)
            .attr("fill", "#000");

        cars.append("circle")
            .attr("cx", -wheelOffsetX)
            .attr("cy", wheelOffsetY)
            .attr("r", 2.8)
            .attr("fill", "#000");

        cars.append("circle")
            .attr("cx", wheelOffsetX)
            .attr("cy", wheelOffsetY)
            .attr("r", 2.8)
            .attr("fill", "#000");

        cars.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", 4)
            .attr("fill", d => d.TextColor)
            .style("font-family", "Orbitron, sans-serif")
            .style("font-size", "10px")
            .text(d => d.Abbreviation);

        // Tooltip
        cars.on("mouseover", function (event, d) {
            tooltip.html(buildTooltipHTML(d))
                .style("opacity", 1);
        }).on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 14) + "px")
                .style("top", (event.pageY - 10) + "px");
        }).on("mouseout", function () {
            tooltip.style("opacity", 0);
        });

        function buildTooltipHTML(d) {
            const timeStr = d.Time ? d.Time.toString() : "–";
            const pointsStr = d.Points != null ? d.Points : "–";
            const gridStr = d.GridPosition != null ? d.GridPosition : "–";

            let posStr;
            if (d.outcomeType === "finish" && d.Position != null) {
                posStr = "P" + d.Position;
            } else if (d.outcomeType === "retired") {
                posStr = "RET";
            } else {
                posStr = "DNF";
            }

            const imgHtml = d.HeadshotUrl
                ? `<img src="${d.HeadshotUrl}" alt="${d.FullName}"/>`
                : "";

            return `
                <div class="tooltip-header">
                    ${imgHtml}
                    <div>
                        <h4>${d.FullName}</h4>
                        <div style="font-size:0.75rem;">${d.TeamName}</div>
                    </div>
                </div>
                <div class="tooltip-line">
                    <span class="label">Start:</span><span>P${gridStr}</span>
                </div>
                <div class="tooltip-line">
                    <span class="label">Finish:</span><span>${posStr}</span>
                </div>
                <div class="tooltip-line">
                    <span class="label">Change:</span><span>${d.changeLabel}</span>
                </div>
                <div class="tooltip-line">
                    <span class="label">Time:</span><span>${timeStr}</span>
                </div>
                <div class="tooltip-line">
                    <span class="label">Status:</span><span>${d.Status}</span>
                </div>
                <div class="tooltip-line">
                    <span class="label">Points:</span><span>${pointsStr}</span>
                </div>
            `;
        }

        // Legend
        const teams = Array.from(
            d3.rollup(
                validDrivers,
                v => v[0].TeamColor,
                d => d.TeamName
            ),
            ([name, color]) => ({ name, color })
        ).sort((a, b) => d3.ascending(a.name, b.name));

        legendContainer.selectAll("*").remove();
        legendContainer.selectAll(".team-legend-item")
            .data(teams)
            .join("div")
            .attr("class", "team-legend-item")
            .each(function (d) {
                const row = d3.select(this);
                row.append("span")
                    .attr("class", "team-legend-swatch")
                    .style("background", d.color);
                row.append("span").text(d.name);
            });
    }

    // ==========================================
    // Animation (Run / Replay)
    // ==========================================
    function animateRace() {
        if (!currentData) return;

        const cars = svg.selectAll(".driver-car");
        if (cars.empty()) return;

        // reset cars to starting grid
        cars.interrupt()
            .attr("transform", d => `translate(${d.startX}, ${d.startY})`);

        // animate cars to final positions
        cars.transition()
            .duration(2300)
            .delay(300)
            .ease(d3.easeCubicInOut)
            .attr("transform", d => `translate(${d.finalX}, ${d.finalY})`);
    }
}