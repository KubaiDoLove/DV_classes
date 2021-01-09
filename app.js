const COUNTY_URL = "./data/education.json"
const GEO_URL = "./data/geo.json"
const ELECTION_URL = "./data/election.json"
const CRIME_URL = "./data/crime.json"

const fullwidth = 1000;
const fullheight = 700;
const padding = 24;
const width = fullwidth - 2*padding;
const height = fullheight - 2*padding;

const interpolationValue = (v, maxV) => 1 - (v / Math.round(maxV))
const reversedInterpolationValue = (v, maxV) => 1 - (1 - v / Math.round(maxV))

Promise.all([
  d3.json(GEO_URL),
  d3.json(COUNTY_URL),
  d3.json(ELECTION_URL),
  d3.json(CRIME_URL)
])
  .then(([countyData, educationData, electionData, crimeData]) =>  {
    const usCounties = topojson.feature(countyData, countyData.objects.counties);		//convert TopoJSON to GeoJSON.
    const usStates = topojson.mesh(countyData, countyData.objects.states, (a, b) => a !== b);			//convert TopoJSON to GeoJSON Mesh Overlay
    const path = d3.geoPath();

    const toolTip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    const electionBlue = "rgb(10, 106, 166)", electionRed = "rgb(205, 24, 28)"
    const graphs = ["education-graph", "election-graph", "crime-graph"]
    const graphsWithLegend = ["education-graph", "crime-graph"]
    const statesVotedForBiden = Object.entries(electionData).filter(([, vote]) => vote === 'Biden').map(([state]) => state)
    const statesVotedForTrump = Object.entries(electionData).filter(([, vote]) => vote === 'Trump').map(([state]) => state)
    const bidenStatesCrime = d3.mean(Object.entries(crimeData).filter(([state]) => statesVotedForBiden.includes(state)).map(([, v]) => v))
    const trumpStatesCrime = d3.mean(Object.entries(crimeData).filter(([state]) => statesVotedForTrump.includes(state)).map(([, v]) => v))
    const bidenStatesEducation = d3.mean(educationData.filter(({ state }) => statesVotedForBiden.includes(state)).map(({ bachelorsOrHigher }) => bachelorsOrHigher))
    const trumpStatesEducation = d3.mean(educationData.filter(({ state }) => statesVotedForTrump.includes(state)).map(({ bachelorsOrHigher }) => bachelorsOrHigher))

    d3.select('#comparison').html(`
      <h2 class="card-title h2">Percentage of adults age 25 and older with a bachelor's degree or higher:</h2>
      <h3 class="card-title h3">Biden: ${bidenStatesEducation.toFixed(2)}% | Trump: ${trumpStatesEducation.toFixed(2)}%</h3>
      <br />
      <h2 class="card-title h2">Reported violent crime rate per 100,000 population:</h2>
      <h3 class="card-title h3">Biden: ${bidenStatesCrime.toFixed(2)} | Trump: ${trumpStatesCrime.toFixed(2)}</h3>
    `)

    graphs.forEach(graph => {
      let minVal = 0, maxVal = 0
      switch (graph) {
        case "education-graph":
          minVal = d3.min(educationData, ({ bachelorsOrHigher }) => bachelorsOrHigher);
          maxVal = d3.max(educationData, ({ bachelorsOrHigher }) => bachelorsOrHigher);
          break
        case "crime-graph":
          minVal = d3.min(Object.values(crimeData))
          maxVal = d3.max(Object.values(crimeData))
          break
      }
      const variance = (Math.abs(maxVal) - Math.abs(minVal))/10;

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
              return d3.interpolateRdYlBu(interpolationValue(bachelorsOrHigher, maxVal))
            case "election-graph":
              return electionData[state] === 'Biden' ? electionBlue : electionRed
            case "crime-graph":
              return d3.interpolateOrRd(reversedInterpolationValue(crimeData[state], maxVal))
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
              <br />
              Crime rate: ${crimeData[state]}/100,000 people
            `)
            .style("left", (d3.event.pageX + 15) + "px")
            .style("top", (d3.event.pageY - 50) + "px")
            .style("background", () => {
              switch (graph) {
                case "education-graph":
                  return d3.interpolateRdYlBu(interpolationValue(bachelorsOrHigher, maxVal))
                case "election-graph":
                  return electionData[state] === 'Biden' ? electionBlue : electionRed
                case "crime-graph":
                  return d3.interpolateOrRd(reversedInterpolationValue(crimeData[state], maxVal))
                default:
                  return "black"
              }
            })
            .style("color", () => {
              switch (graph) {
                case "education-graph":
                  return "black"
                case "crime-graph":
                  return "black"
                default:
                  return "white"
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
      const numBlocks = 10;

      const gradient = [];
      for (let n = 0; n < numBlocks; ++n) {
        gradient[n] = defs.append("linearGradient")
          .attr("id", `${graph}-svgGradient-${n}`)
          .attr("x1", "0%")
          .attr("x2", "100%")
          .selectAll("stop")
          .data(d3.range(numStops))
          .enter().append("stop")
          .attr("offset", d => d / numStops)
          .attr("stop-color", d => {
            switch (graph) {
              case "education-graph":
                return d3.interpolateRdYlBu(1 - (d + n) * 0.1);
              case "crime-graph":
                return d3.interpolateOrRd(1 - (1 - (d + n) * 0.1));
              default:
                return "grey"
            }
          });
      }

      if (graphsWithLegend.includes(graph)) {
        //Add SVG Legend
        const legend = svg.append("g").attr("class", "legend")

        //Add colored rectangles to legend
        const legendSize = 20;
        for (let k = 0; k < numBlocks ; ++k) {
          legend.append("rect")
            .style("stroke", "black")
            .style("stroke-width", 1.5)
            .attr("x", 0.1 * fullwidth + k * (legendSize * 2 + 1))
            .attr("y", fullheight - padding)
            .attr("width", legendSize * 3 + 1)
            .attr("height", legendSize / 2)
            .style("fill", `url(#${graph}-svgGradient-${k})`);
        }

        for (let j = 0; j <= numBlocks; ++j) {
          legend.append("text")
            .attr("x", 0.1 * fullwidth + j * (legendSize * 2 + 1))
            .attr("y", fullheight - padding - legendSize * 0.5)
            .text(Math.round((minVal + (j * variance)) * 100) / 100);
        }
      }
    })
  });
