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

function heartAndSleep(dataByName) {
    let width = 1000
    let height = 300

    let heartRate = dataByName['heart_rate'].data
    let sleep = dataByName['sleep_analysis'].data

    let heartRateCount = heartRate.length
    let sleepCount = sleep.length

    // Find our date bounds
    let firstHeartRateDate = dateFromHealthExportDateString(heartRate[0]['date'])
    let firstSleepDate = dateFromHealthExportDateString(sleep[0]['inBedStart'])
    let firstDate = new Date(Math.min(firstHeartRateDate, firstSleepDate))

    let lastHeartRateDate = dateFromHealthExportDateString(heartRate[heartRateCount-1]['date'])
    let lastSleepDate = dateFromHealthExportDateString(sleep[sleepCount-1]['inBedEnd'])
    let lastDate = new Date(Math.max(lastHeartRateDate, lastSleepDate))

    let timeScale = d3.scaleTime()
        .domain([firstDate, lastDate])
        .range([0, width])

    let containerPadding = 50

    let container = d3.create('svg')
        .attr('viewBox',
            [-containerPadding,
            -containerPadding,
            width + 2 * containerPadding,
            height + 2 * containerPadding])
        .classed('heartAndSleep', true)

    // each is an array of dictionaries
    // dictionaries have 'start' and 'end' dates
    var inBedData = new Array()
    var asleepData = new Array()
    for (var sleepIndex in sleep) {
        let sleepItem = sleep[sleepIndex]
        let inBedStart = dateFromHealthExportDateString(sleepItem['inBedStart'])
        let inBedEnd = dateFromHealthExportDateString(sleepItem['inBedEnd'])
        let sleepStart = dateFromHealthExportDateString(sleepItem['sleepStart'])
        let sleepEnd = dateFromHealthExportDateString(sleepItem['sleepEnd'])

        let inBed = {
            'start' : inBedStart,
            'end' : inBedEnd,
        }
        inBedData.push(inBed)
        let asleep = {
            'start' : sleepStart,
            'end' : sleepEnd,
        }
        asleepData.push(asleep)
    }

    // Add in in-bed and asleep indicators
    let inBedIndicators = container.selectAll('.inBed')
        .data(inBedData)
        .join('rect')
        .attr('x', function(d) {
            return timeScale(d['start'])
        })
        .attr('width', function(d) {
            return timeScale(d['end']) - timeScale(d['start'])
        })
        .attr('height', height)
        .classed('inBed', true)
    let asleepIndicators = container.selectAll('.sleep')
        .data(asleepData)
        .join('rect')
        .attr('x', function(d) {
            return timeScale(d['start'])
        })
        .attr('width', function(d) {
            return timeScale(d['end']) - timeScale(d['start'])
        })
        .attr('height', height)
        .classed('sleep', true)

    // Find heart rate minimum and maximum
    var heartRateMin = 200
    var heartRateMax = 0
    heartRate.map(function(d) {
        heartRateMin = Math.min(heartRateMin, d['Avg'])
        heartRateMax = Math.max(heartRateMax, d['Avg'])
    })
    let heartRateRange = d3.scaleLog()
    .domain([heartRateMax, heartRateMin])
    .range([0, height])

    // Add in heart rate readings
    let heartRateIndicator = container.selectAll('.heart_rate')
        .data(heartRate)
        .join('circle')
        .attr('cx', function(d) {
            return timeScale(dateFromHealthExportDateString(d['date']))
        })
        .attr('cy', function(d) {
            return heartRateRange(d['Avg'])
        })
        .attr('r', 2)
        .classed('heart_rate', true)

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
    document.body.appendChild(heartAndSleep(dataByName))
}

window.onload = function() {
    let dataElement = document.getElementById('data')
    data = JSON.parse(dataElement.innerHTML)
    update(data)
}
