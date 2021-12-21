function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

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

function updateMetric(metricItem, dateRange) {
    // Skip empty items
    if (metricItem['data'].length == 0) {
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

    let name = metricItem['name']
    let unit = metricItem['units']
    let data = metricItem['data']

    // Make a container for this item
    let container = document.createElement('div')
    container.id = name
    document.body.appendChild(container)

    // Compute the largest entry, for some sense of scale
    let largest = 0;
    for (const dataIndex in data) {
        let dataEntry = data[dataIndex]
        let quantity = Number.parseInt(dataEntry['qty'])
        if (quantity > largest) {
            largest = quantity;
        }
    }

    console.log(name + ': ' + largest);

    console.log(metricItem);

    // Process data
    for (const dataIndex in data) {
        let dataEntry = data[dataIndex]
        let dateString = dataEntry['date']
        let quantity = Number.parseInt(dataEntry['qty'])
        let components = dateString.split(' ')
        // The day, month, and year
        var date = new Date(components[0])

        // Populate hour, minute, and seconds
        let hour = Number.parseInt(components[1].split(':')[0])
        let min = Number.parseInt(components[1].split(':')[1])
        let sec = Number.parseInt(components[1].split(':')[2])

        date.setHours(hour)
        date.setMinutes(min)
        date.setSeconds(sec)
        date.setDate(date.getDate() + 1)

        let entry = {
            'date' : date,
            'qty' : quantity
        }
        let dayFormatOptions = { day: 'numeric', month : 'numeric', year: 'numeric' }
        let dayTotalKey = date.toLocaleDateString(undefined, dayFormatOptions)
    }

    let summaryElement = document.createElement('div')
    summaryElement.className = 'summary'
    container.appendChild(summaryElement)

    let summaryHeader = document.createElement('h1')
    container.appendChild(summaryHeader)

    let summaryToday = document.createElement('h2')
    container.appendChild(summaryToday)
}

function update(dataContents) {
    let data = dataContents['data']
    let metrics = data['metrics']
    let workouts = data['workouts']

    // Compute bounds
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

    for (const itemIndex in metrics) {
        updateMetric(metrics[itemIndex], dateRange)
    }
}

window.onload = function() {
    let dataElement = document.getElementById('data')
    data = JSON.parse(dataElement.innerHTML)
    update(data)
}
