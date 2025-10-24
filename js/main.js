(function prj() {

    // Global SVG configuration
    const WIDTH = 800;
    const HEIGHT = 400;

    // Create each visualization section immediately
    viz1();
    viz2();

    // Visualization 1
    function viz1() {
        const container = d3.select("#viz1");
        const svg = container.append("svg")
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .style("background", "#1c1c1c");

        svg.append("text")
            .attr("x", WIDTH / 2)
            .attr("y", HEIGHT / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .style("font-size", "24px")
            .text("Viz 2: Awaiting Data");
    }

    // Visualization 2
    function viz2() {
        const container = d3.select("#viz2");
        const svg = container.append("svg")
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .style("background", "#1c1c1c");

        svg.append("text")
            .attr("x", WIDTH / 2)
            .attr("y", HEIGHT / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .style("font-size", "24px")
            .text("Viz 3: Awaiting Data");
    }

})(); // self-invoking closure
