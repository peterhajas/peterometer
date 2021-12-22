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
    // Some constants
    let width = 400
    let height = 600

    let interMacroPadding = 10
    let macroCount = 4
    let barHeightTotal = 400
    let barHeight = barHeightTotal - (macroCount * interMacroPadding)

    // Grab the macros and group by day
    let fat = aggregateDataByDay(dataByName['total_fat'])
    let carbs = aggregateDataByDay(dataByName['carbohydrates'])
    let protein = aggregateDataByDay(dataByName['protein'])
    let calories = aggregateDataByDay(dataByName['dietary_energy'])

    let count = calories.length

    let calorieMax = d3.max(calories, x => x['sum'])
    let calorieRange = d3.scaleLinear()
    .domain([0, calorieMax])
    .range([0, barHeight])

    let container = d3.create('svg')
    .attr('viewBox', [0, 0, width, height])
    .classed('nutrition', true)

    // Constants for our days
    let dayWidth = width/count
    let dayDataWidth = dayWidth * 0.8

    // The graph is a horizontal set of days
    // Each day has child rectangles representing the macros for that day
    let dayNodes = container.selectAll('g')
    .data(calories)
    .join('g')
    .attr('transform', function(d, i) {
        // x - index divided by width
        // y - center in available space
        let x = dayWidth * i
        let yInRange = calorieRange(d['sum'])
        // 3* because some of this height is consumed by padding
        let y = ((barHeight - yInRange) / 2) + 5
        return 'translate(' + x + ',' + y + ')'
    })

    // Add in a background rect for the days
    dayNodes.append('rect')
    .attr('width', (width / count))
    .attr('height', function(d) {
        return calorieRange(d['sum'])
    })
    .classed('calorie_day_container', true)

    // Add in each macro
    // First, fat
    dayNodes.append('rect')
    .attr('x', (dayWidth - dayDataWidth)/2)
    .attr('width', dayDataWidth)
    .attr('height', function(_, i) {
        let fatCalories = fat[i]['sum'] * 9
        return calorieRange(fatCalories)
    })
    .classed('bar', true)
    .classed('total_fat', true)

    // Next, carbs
    dayNodes.append('rect')
    .attr('x', (dayWidth - dayDataWidth)/2)
    .attr('y', function(_, i) {
        let fatCalories = fat[i]['sum'] * 9
        return calorieRange(fatCalories) + interMacroPadding
    })
    .attr('width', dayDataWidth)
    .attr('height', function(_, i) {
        let carbCalories = carbs[i]['sum'] * 4
        return calorieRange(carbCalories)
    })
    .classed('bar', true)
    .classed('carbo', true)

    // Then, protein
    dayNodes.append('rect')
    .attr('x', (dayWidth - dayDataWidth)/2)
    .attr('y', function(_, i) {
        let fatCalories = fat[i]['sum'] * 9
        let carbCalories = carbs[i]['sum'] * 4
        return calorieRange(fatCalories + carbCalories) + interMacroPadding * 2
    })
    .attr('width', dayDataWidth)
    .attr('height', function(_, i) {
        let proteinCalories = protein[i]['sum'] * 4
        return calorieRange(proteinCalories)
    })
    .classed('bar', true)
    .classed('protein', true)

    // And... leftovers!
    // Sometimes, if we don't log lose-it stuff with good data, we will have 
    // calories that are unaccounted for. This is the leftover section
    dayNodes.append('rect')
    .attr('x', (dayWidth - dayDataWidth)/2)
    .attr('y', function(_, i) {
        let fatCalories = fat[i]['sum'] * 9
        let carbCalories = carbs[i]['sum'] * 4
        let proteinCalories = protein[i]['sum'] * 4
        return calorieRange(fatCalories + carbCalories + proteinCalories) + interMacroPadding * 3
    })
    .attr('width', dayDataWidth)
    .attr('height', function(_, i) {
        let totalCalories = calories[i]['sum']

        let fatCalories = fat[i]['sum'] * 9
        let carbCalories = carbs[i]['sum'] * 4
        let proteinCalories = protein[i]['sum'] * 4
        let leftovers = totalCalories - (fatCalories + carbCalories + proteinCalories)
        console.log(leftovers)
        if (leftovers < 0) { return 0 }
        return calorieRange(leftovers)
    })
    .classed('bar', true)
    .classed('leftover_calories', true)

    // Add in incicators for the calories
    dayNodes.append('text')
    .attr('x', dayWidth/2)
    .attr('y', barHeightTotal)
    .attr('dy', 30)
    .attr('transform', function(d) { // this undoes the transform above
        let yInRange = calorieRange(d['sum'])
        let y = (barHeight - yInRange) / 2 * -1
        return 'translate(0,' + y + ')'
    })
    .attr('text-anchor', 'middle')
    .text(function(d) {
        return Math.round(d['sum']) + 'kcal'
    })
    .classed('text', true)

    // Add in indicators for the days
    dayNodes.append('text')
    .attr('x', dayWidth/2)
    .attr('y', barHeightTotal)
    .attr('dy', 60)
    .attr('transform', function(d) { // this undoes the transform above
        let yInRange = calorieRange(d['sum'])
        let y = (barHeight - yInRange) / 2 * -1
        return 'translate(0,' + y + ')'
    })
    .attr('text-anchor', 'middle')
    .text(function(d) {
        // the month and day
        let date = d.date
        let month = date.getMonth()+1;
        let day = date.getDate()
        return month+'/'+day;
    })
    .classed('text2', true)

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
