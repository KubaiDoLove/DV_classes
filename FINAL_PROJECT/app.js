const COUNTY_URL = "./data/education.json"
const GEO_URL = "./data/geo.json"
const ELECTION_URL = "./data/election.json"
const fullwidth = 1000;
const fullheight = 700;
const padding = 24;
const width = fullwidth - 2*padding;
const height = fullheight - 2*padding;

Promise.all([
  d3.json(GEO_URL),
  d3.json(COUNTY_URL),
  d3.json(ELECTION_URL)
])
  .then(([countyData, educationData, electionData]) =>  {
    const usCounties = topojson.feature(countyData, countyData.objects.counties);		//convert TopoJSON to GeoJSON.
    const usStates = topojson.mesh(countyData, countyData.objects.states, (a, b) => a !== b);			//convert TopoJSON to GeoJSON Mesh Overlay
    const path = d3.geoPath();

    const toolTip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    const electionBlue = "rgb(10, 106, 166)", electionRed = "rgb(205, 24, 28)"
    const minEducation = d3.min(educationData, ({ bachelorsOrHigher }) => bachelorsOrHigher);
    const maxEducation = d3.max(educationData, ({ bachelorsOrHigher }) => bachelorsOrHigher);
    const stepVariance = (Math.abs(maxEducation) - Math.abs(minEducation))/10;

    const graphs = ["education-graph", "election-graph"]
    graphs.forEach(graph => {
      //Create SVG
      const svg = d3.select('#' + graph)
        .append("svg")
        .attr("width", fullwidth)
        .attr("height", fullheight);

      // Draw Counties Map
      svg.selectAll("path")
        .data(usCounties.features)
        .enter()
        .append("path")
        .style("fill", d => {
          const { bachelorsOrHigher = 0, state = '' } = educationData.find(({ fips }) => fips === d.id) || {}
          switch (graph) {
            case "education-graph":
              return (d3.interpolateRdYlBu(1-(bachelorsOrHigher / Math.round(maxEducation))));
              case "election-graph":
                return electionData[state] === 'Biden' ? electionBlue : electionRed
            default:
              return "white"
          }
        })
        .style("stroke", d => {
          const { state = '' } = educationData.find(({ fips }) => fips === d.id) || {}
          switch (graph) {
            case "election-graph":
              return electionData[state] === 'Biden' ? electionBlue : electionRed
            default:
              return "grey"
          }
        })
        .style("stroke-width", "0.5px")
        .attr("class", "county")
        .attr("data-education", d => {
          const { bachelorsOrHigher = 0 } = educationData.find(({ fips }) => fips === d.id) || {}
          return bachelorsOrHigher
        })
        .attr("d", path)
        .on("mouseover", d => {
          const {
            area_name = '',
            state = '',
            bachelorsOrHigher = 0
          } = educationData.find(({ fips }) => fips === d.id) || {}
          toolTip
            .html(`
              ${area_name}, ${state}
              <br />
              Education: ${bachelorsOrHigher}%
              <br />
              Voted for: ${electionData[state]}
            `)
            .attr("data-education", bachelorsOrHigher)
            .style("left", (d3.event.pageX + 15) + "px")
            .style("top", (d3.event.pageY - 50) + "px")
            .style("background", () => {
              switch (graph) {
                case "election-graph":
                  return electionData[state] === 'Biden' ? electionBlue : electionRed
                case "education-graph":
                  return d3.interpolateRdYlBu(1-(bachelorsOrHigher / Math.round(maxEducation)))
                default:
                  return "black"
              }
            })
            .style("color", () => {
              switch (graph) {
                case "election-graph":
                  return "white"
                default:
                  return "black"
              }
            })
            .style("opacity", 0.9);
        })
        .on("mouseout", () => {
          toolTip.style("opacity", 0);	//Hide until mouseover
        });

      // Draw States Map Overlay
      svg.append("path")
        .datum(usStates)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-linejoin", "round")
        .attr("class", "states")
        .attr("d", path);

      //Setup legend gradient
      const defs = svg.append("defs");

      const numStops = 2;
      let numBlocks = 0;
      switch (graph) {
        case "education-graph":
          numBlocks = 10
          break
        case "election-graph":
          numBlocks = 2
          break
      }

      const gradient = [];
      for (let n = 0; n < numBlocks; ++n) {
        gradient[n] = defs.append("linearGradient")
          .attr("id", `${graph}-svgGradient-${n}`)
          .attr("x1", "0%")
          .attr("x2", "100%")
          .selectAll("stop")
          .data(d3.range(numStops))
          .enter().append("stop")
          .attr("offset", (d) => d/numStops)
          .attr("stop-color", (d) => {
            switch (graph) {
              case "education-graph":
                return d3.interpolateRdYlBu(1-(d+n)*0.1);
              case "election-graph":
                return n === 0 ? electionBlue : electionRed
              default:
                return "grey"
            }
          });
      }

      //Add SVG Legend
      const legend = svg.append("g").attr("class", "legend")

      //Add colored rectangles to legend
      const legendSize = 20;
      for (let k = 0; k < numBlocks ; ++k) {
        switch (graph) {
          case "education-graph":
            legend.append("rect")
              .style("stroke", "black")
              .style("stroke-width", 1.5)
              .attr("x", 0.1 * fullwidth+k*(legendSize*2+1))
              .attr("y", fullheight - padding)
              .attr("width", (legendSize*3+1))
              .attr("height", legendSize/2)
              .style("fill", `url(#${graph}-svgGradient-${k})`);
            break
        }
      }

      //Add text to legend
      switch (graph) {
        case "education-graph":
          for (let j = 0; j <= numBlocks; ++j) {
            legend.append("text")
              .attr("x", 0.1 * fullwidth +j*(legendSize*2+1))
              .attr("y", fullheight - padding - legendSize*0.5)
              .text(Math.round((minEducation+(j*stepVariance)) * 100) / 100);
          }
          break
      }
    })
  });
