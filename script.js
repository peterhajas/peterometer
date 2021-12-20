function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function updateMetric(metricItem) {
    // Skip empty items
    if (metricItem['data'].length == 0) {
        return;
    }

    let name = metricItem['name']
    let unit = metricItem['units']
    let data = metricItem['data']

    // Make a container for this item
    let container = document.createElement('div')
    container.id = name
    document.body.appendChild(container)

    var metric = { }
    metric['name'] = name
    metric['unit'] = unit
    metric['data'] = [ ]
    metric['total'] = 0
    metric['totalsByDay'] = { }
    metric['originalData'] = metricItem

    // The days this metric was recorded, from oldest to newest
    metric['days'] = [ ]

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
        metric['data'].push(entry)
        metric['total'] += quantity

        let dayFormatOptions = { day: 'numeric', month : 'numeric', year: 'numeric' }
        let dayTotalKey = date.toLocaleDateString(undefined, dayFormatOptions)
        var totalForDay = metric['totalsByDay'][dayTotalKey] || 0
        totalForDay += quantity
        metric['totalsByDay'][dayTotalKey] = totalForDay
        metric['days'].push(dayTotalKey)
    }

    metric['days'] = metric['days'].filter(onlyUnique)

    let dayCount = metric['days'].length
    let latestDay = metric['days'][dayCount - 1]

    console.log(metric)

    let summaryElement = document.createElement('div')
    summaryElement.className = 'summary'
    container.appendChild(summaryElement)

    let summaryHeader = document.createElement('h1')
    container.appendChild(summaryHeader)
    summaryHeader.innerHTML = metric['name']

    let summaryToday = document.createElement('h2')
    container.appendChild(summaryToday)
    summaryToday.innerHTML = metric['totalsByDay'][latestDay] + ' ' + metric['unit']

    return metric
}

function update(dataContents) {
    let data = dataContents['data']
    let metrics = data['metrics']
    let workouts = data['workouts']

    for (const itemIndex in metrics) {
        updateMetric(metrics[itemIndex])
    }
}

window.onload = function() {
    let dataElement = document.getElementById('data')
    data = JSON.parse(dataElement.innerHTML)
    update(data)
}
