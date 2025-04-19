let width = 1000, height = 600;

let svg = d3.select("svg")
    // resizing of svg element
    .attr("viewBox", "0 0 " + width + " " + height);
    // .attr("width", width)
    // .attr("height", height);

function toTitleCase(string) {
    return string
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

// Load dataset
Promise.all([d3.json("data/MP2019_Subzone_Boundary.json"), d3.csv("data/populationData2024.csv")]
).then(data => {
    // Understand data structure
    console.log(data[0].features)
    console.log(data[1])

    let subzoneData = data[0].features;
    let populationData = data[1];

    subzoneData.forEach(d => {
        // Create a DOM parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(d.properties.Description, 'text/html');

        // Get all rows after the header row
        const rows = Array.from(doc.querySelectorAll('table tr')).slice(1);

        const attributes = {};

        rows.forEach(row => {
            const th = row.querySelector('th');
            const td = row.querySelector('td');
            if (th && td) {
                attributes[th.textContent.trim()] = td.textContent.trim();
            }
        });

        let sz = populationData.find(e => e.Subzone.toUpperCase() == attributes.SUBZONE_N);
        d.populationdata = (sz != undefined) ? parseInt(sz.Population) : 0;
        d.subzone_name = attributes.SUBZONE_N;
        d.PA_name = toTitleCase(attributes.PLN_AREA_N);
        d.region_name = toTitleCase(attributes.REGION_N);
    })

    console.log(subzoneData);

    // Map and projection (onto svg space)
    let projection = d3.geoMercator()
    .center([103.851959, 1.290270]) // Singapore's longitude / latitude;
    .fitExtent([[60, 50], [990, 580]], data[0])
    //.scale(500);
    let geopath = d3.geoPath().projection(projection);

    // 5. Define color scale
    const maxPop = d3.max(subzoneData, d => d.populationdata);
    const color = d3.scaleSequential()
        .domain([0, maxPop])
        .interpolator(d3.interpolateReds);

    // Tooltips
    const tooltip = d3.select("#tooltip");
    const formatComma = d3.format(",");

    /* Title of Chart */
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 28)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-color", "black")
        .attr("font-weight", "bold")
        .attr("font-family", "Cambria")
        .text("Singapore's Population (2024) by Subzone");

    // Draw the map
    svg.append("g")
        .attr("id", "subzones")
        .selectAll("path")
        .data(subzoneData)
        .enter()
        .append("path")
        .attr("d",  d => geopath(d))
        .attr("fill", d => {
            if (d.populationdata === 0) {return "grey"} else {return color(d.populationdata)}})
        .attr("stroke", "black")
            .on("mouseover", function (event, d) {
                tooltip
                .style("opacity", 1)
                .html(
                    `<strong>${d.subzone_name}</strong><br/>Planning Area: ${d.PA_name} <br/>Region: ${d.region_name} <br/>Population: ${formatComma(d.populationdata)}`
                );
        
                d3.select(event.currentTarget)
                .style("fill", "yellow")
                //.style("stroke", "red")
            })
            .on("mousemove", function (event) {
                tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (event, d) {
                tooltip.style("opacity", 0)
                .text("");

                d3.select(event.currentTarget)
                .style("fill", d => {
                    if (d.populationdata === 0) {return "grey"} else {return color(d.populationdata)}});
            });
    
    /* Legend */
    const legendWidth = 15;
    const legendHeight = 300;
    // const legendPadding = 10;

    const legend = svg.append("g")
    //.attr("transform", `translate(${width - 100}, 0)`);
    .attr("transform", `translate(${legendWidth + 10}, ${(height - legendHeight) / 2})`);

    // Create a gradient using population count data
    const defs = svg.append("defs");

    const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient-vertical")
    .attr("x1", "0%").attr("y1", "100%")
    .attr("x2", "0%").attr("y2", "0%");  // vertical gradient

    linearGradient.selectAll("stop")
    .data(d3.range(0, 1.01, 0.01))
    .enter()
    .append("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d => color(d * maxPop));

    // Append rectangle using gradient
    legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient-vertical)");

    // Add scale axis
    const legendScale = d3.scaleLinear()
    .domain([0, maxPop])
    .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
    .ticks(5)
    .tickFormat(d3.format(".0s"));

    legend.append("g")
    .attr("transform", `translate(${legendWidth}, 0)`)
    .call(legendAxis);

    // Label for legend
    legend.append("text")
    .attr("x", -18)
    .attr("y", -35)
    .attr("text-anchor", "start")
    .style("font-size", "18px")
    .style("font-family", "Cambria")
    .style("font-weight", "bold")
    .text("Legend:");

    legend.append("text")
    .attr("x", -10)
    .attr("y", -10)
    .attr("text-anchor", "start")
    .style("font-size", "12px")
    .style("font-family", "Cambria")
    .style("font-weight", "bold")
    .text("Population count");

    // Append North Arrow
    svg.append("image")
    .attr("href", "images/North arrow.png")  // replace with your image path
    .attr("x", 900)
    .attr("y", 30)
    .attr("width", 40)
    .attr("height", 40);

})