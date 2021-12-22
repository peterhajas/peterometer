function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

/// Returns a date from a "Health Export" date string
function dateFromHealthExportDateString(dateString) {
    let date = dateString.split(' ')[0]
    let year = date.split('-')[0]
    let month = date.split('-')[1]
    let day = date.split('-')[2]

    let time = dateString.split(' ')[1]
    let hour = time.split(':')[0]
    let minute = time.split(':')[1]
    let second = time.split(':')[2]

    let gmtOffset = dateString.split(' ')[2]

    var outDate = new Date()

    outDate.setDate(Number.parseInt(day))
    outDate.setMonth(Number.parseInt(month)-1)
    outDate.setFullYear(Number.parseInt(year))
    outDate.setHours(Number.parseInt(hour))
    outDate.setMinutes(Number.parseInt(minute))
    outDate.setSeconds(Number.parseInt(second))

    return outDate
}

/// Returns the date without hours, minutes, or seconds
function dateStrippingTimeComponents(date) {
    var out = date
    out.setHours(0)
    out.setMinutes(0)
    out.setSeconds(0)
    return out
}

function metricAggregatesDaily(name) {
    return name.includes('dietary')
    || name.includes('carbohydrates')
    || name.includes('fat')
    || name.includes('fiber')
    || name.includes('protein')
    || name.includes('sodium')
    || name.includes('apple')
    || name.includes('energy')
}

/// Aggregates data by day for a metric item
/// Returns an ordered array, from oldest to newest, of dictionaries
/// The keys are:
/// - data - a set of data items that occurred on this day
/// - date - the date the data items occurred on
/// - sum - a sum of the data for this day
function aggregateDataByDay(metricItem) {
    let data = metricItem['data']

    var out = new Array()
    var currentDateTime = 0
    var currentItem = null

    for (var datumIndex in data) {
        let datum = data[datumIndex]
        var datumDate = dateStrippingTimeComponents(dateFromHealthExportDateString(datum['date']))
        if (currentDateTime != datumDate.getTime()) {
            if (currentItem != null) {
                out.push(currentItem)
            }
            currentDateTime = datumDate.getTime()
            currentItem = { }
            currentItem['date'] = datumDate
            currentItem['data'] = new Array()
            currentItem['sum'] = 0
        }
        else {
            currentItem['data'].push(datum)
            currentItem['sum'] = currentItem['sum'] + datum['qty']
        }
    }

    return out
}

function updateMetric(metricItem, dateRange) {
    let name = metricItem['name']
    let unit = metricItem['units']
    let data = metricItem['data']

    aggregateDataByDay(metricItem)

    // Skip empty items
    if (data == 0) {
        return;
    }

    const metricContainer = d3.create('div')
    .classed('metricContainer', true)

    const dataEntries = metricContainer.append('svg')
    .selectAll('svg')
    .data(metricItem['data'])
    .join('ellipse')
    .attr('color', 'red')
    .attr('cx', function(datum, index, _) {
        let date = dateFromHealthExportDateString(datum['date'])
        let fraction = dateRange(date)
        return index * 10
    })
    .attr('cy', 1)
    .attr('rx', 5)
    .attr('ry', function(datum, index, _) {
        return index
    })

    document.body.appendChild(metricContainer.node())

    // Make a container for this item
    let container = document.createElement('div')
    container.id = name
    document.body.appendChild(container)
}

function nutrition(dataByName) {
    // Grab the macros and group by day
    let fat = aggregateDataByDay(dataByName['total_fat'])
    let carbs = aggregateDataByDay(dataByName['carbohydrates'])
    let protein = aggregateDataByDay(dataByName['protein'])

    // Grab the most recent of each day
    let data = [
        {
            'name' : 'fat',
            'data' : fat[fat.length-1]['sum'],
        },
        {
            'name' : 'carbs',
            'data' : carbs[carbs.length-1]['sum'],
        },
        {
            'name' : 'protein',
            'data' : protein[protein.length-1]['sum'],
        }
    ]
    let names = [ 'fat', 'carbs', 'protein' ]
    let container = d3.create('svg')
    .attr('viewBox', [0, 0, 100, 400])
    .classed('nutrition', true)

    let valueRange = d3.scaleLinear()
        .domain([0, d3.sum(d3.map(data, x => x['data']))])
        .range([0, 400])

    let node = container.selectAll('g')
    .data(data)
    .join('g')
    .attr('transform', function(d,i) {
        var accum = 0
        for (var j = 0; j < i; j++) {
            accum += valueRange(data[j]['data'])
        }
        return 'translate(0,' + accum + ')'
    })

    node.append('rect')
    .attr('x', 0)
    .attr('width', 100)
    .attr('height', function(d) {
        return valueRange(d['data'])
    })
    .attr('class', function(d) {
        return d['name']
    })

    node.append('text')
    .text(function(d) {
        console.log(d)
        return d['name'][0]
    })
    .attr('text-anchor', 'middle')
    .attr('x', 50)
    .attr('dy', 30)

    return container.node()
}

function update(dataContents) {
    let data = dataContents['data']
    let metrics = data['metrics']
    let workouts = data['workouts']

    // Compute date range
    var earliestDate = new Date()
    var latestDate = new Date()
    latestDate.setFullYear(1000)
    for (const itemIndex in metrics) {
        let item = metrics[itemIndex]['data']
        for (const dataIndex in item) {
            let dataEntry = item[dataIndex]
            let dateString = dataEntry['date']
            let date = dateFromHealthExportDateString(dateString)
            if (date < earliestDate) {
                earliestDate = date
            }
            if (date > latestDate)  {
                latestDate = date
            }
        }
    }
    let dateRange = d3.scaleTime()
        .domain([earliestDate, latestDate])
        .nice()

    // Group data by name
    var dataByName = { }
    for (const itemIndex in metrics) {
        let metricItem = metrics[itemIndex]
        let name = metricItem['name']
        dataByName[name] = metricItem
    }

    document.body.appendChild(nutrition(dataByName))
}

window.onload = function() {
    let dataElement = document.getElementById('data')
    data = JSON.parse(dataElement.innerHTML)
    update(data)
}
