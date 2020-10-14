const width = 800,
    height = 400,
    barWidth = width/275;

const tooltip = d3.select(".visHolder").append("div")
    .attr("id", "tooltip")
    .style("opacity", 0);

const overlay = d3.select('.visHolder').append('div')
    .attr('class', 'overlay')
    .style('opacity', 0);

const svgContainer =  d3.select('.visHolder')
    .append('svg')
    .attr('width', width + 100)
    .attr('height', height + 60);

d3.json('https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/GDP-data.json', (err, data) => {

    svgContainer.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -200)
        .attr('y', 80)
        .text('Gross Domestic Product');

    svgContainer.append('text')
        .attr('x', width/2 + 120)
        .attr('y', height + 50)
        .text('More Information: http://www.bea.gov/national/pdf/nipaguid.pdf')
        .attr('class', 'info');

    const years = data.data.map(item => {
        let quarter;
        const temp = item[0].substring(5, 7);

        if(temp === '01') {
            quarter = 'Q1';
        }
        else if (temp === '04'){
            quarter = 'Q2';
        }
        else if(temp === '07') {
            quarter = 'Q3';
        }
        else if(temp ==='10') {
            quarter = 'Q4';
        }

        return item[0].substring(0, 4) + ' ' + quarter
    });

    const yearsDate = data.data.map(item => new Date(item[0]));

    const xMax = new Date(d3.max(yearsDate));
    xMax.setMonth(xMax.getMonth() + 3);
    const xScale = d3.scaleTime()
        .domain([d3.min(yearsDate), xMax])
        .range([0, width]);

    const xAxis = d3.axisBottom()
        .scale(xScale);

    const xAxisGroup = svgContainer.append('g')
        .call(xAxis)
        .attr('id', 'x-axis')
        .attr('transform', 'translate(60, 400)');

    const GDP = data.data.map(item => item[1]);

    let scaledGDP;

    const gdpMin = d3.min(GDP);
    const gdpMax = d3.max(GDP);

    const linearScale = d3.scaleLinear()
        .domain([0, gdpMax])
        .range([0, height]);

    scaledGDP = GDP.map(item => linearScale(item));

    const yAxisScale = d3.scaleLinear()
        .domain([0, gdpMax])
        .range([height, 0]);

    const yAxis = d3.axisLeft(yAxisScale)

    const yAxisGroup = svgContainer.append('g')
        .call(yAxis)
        .attr('id', 'y-axis')
        .attr('transform', 'translate(60, 0)');

    d3.select('svg').selectAll('rect')
        .data(scaledGDP)
        .enter()
        .append('rect')
        .attr('data-date', (d, i) => data.data[i][0])
        .attr('data-gdp', (d, i) => data.data[i][1])
        .attr('class', 'bar')
        .attr('x', (d, i) => xScale(yearsDate[i]))
        .attr('y', (d) => height - d)
        .attr('width', barWidth)
        .attr('height', d => d)
        .style('fill', '#123242')
        .attr('transform', 'translate(60, 0)')
        .on('mouseover', (d, i) => {
            overlay.transition()
                .duration(0)
                .style('height', d + 'px')
                .style('width', barWidth + 'px')
                .style('opacity', 1)
                .style('left', (i * barWidth) + 0 + 'px')
                .style('top', height - d + 'px')
                .style('transform', 'translateX(60px)');
            tooltip.transition()
                .duration(120)
                .style('opacity', 1);
            tooltip.html(years[i] + '<br>' + '$' + GDP[i].toFixed(1).replace(/(\d)(?=(\d{3})+\.)/g, '$1,') + ' Billion')
                .attr('data-date', data.data[i][0])
                .style('left', (i * barWidth) + 30 + 'px')
                .style('top', height - 100 + 'px')
                .style('transform', 'translateX(60px)');
        })
        .on('mouseout', () => {
            tooltip.transition()
                .duration(120)
                .style('opacity', 0);
            overlay.transition()
                .duration(120)
                .style('opacity', 0);
        });

});
