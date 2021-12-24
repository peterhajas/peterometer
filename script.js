function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

/// Returns a d3 selection of a container div with an SVG inside of it
/// This can have a title attached, represented by an array of dictionaries
/// Keys are:
/// - text: the text of this title entry
/// - className: the class name to apply to this title entry
/// No view box is applied to the svg

function svgContainer(titles) {
    let container = d3.create('div')
    .classed('container', true)

    let titleContainer = container.append('div')
    .classed('titleContainer', true)
    .style('width', 0)
    .style('padding-bottom', 10)
    .style('color', 'white')

    titleContainer.selectAll('h1')
    .data(titles)
    .join('span')
    .text(function(d) {
        return d.text
    })
    .attr('class', function(d) {
        return d.className
    })
    .style('padding', 2)

    container.append('svg')

    return container
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
    let width = 500
    let height = 500

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

    let container = svgContainer([
        { 'text' : 'Fat', 'className' : 'total_fat' },
        { 'text' : 'Carbs', 'className' : 'carbo' },
        { 'text' : 'Protein', 'className' : 'protein' },
        { 'text' : 'Other', 'className' : 'leftover_calories' },
    ])
    let svg = container
        .select('svg')
        .attr('viewBox', [0, 0, width, height])
        .classed('nutrition', true)

    // Constants for our days
    let dayWidth = width/count
    let dayDataWidth = dayWidth * 0.8

    // The graph is a horizontal set of days
    // Each day has child rectangles representing the macros for that day
    let dayNodes = svg.selectAll('g')
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
        return Math.round(d['sum'])
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

function sleepHeartRate(dataByName, dateRange) {
    let width = 1000
    let height = 100

    let heartRate = dataByName['heart_rate'].data
    let sleep = dataByName['sleep_analysis'].data

    let heartRateCount = heartRate.length
    let sleepCount = sleep.length

    let container = svgContainer([
        { 'text' : 'Sleep' , 'className' : 'sleep' },
        { 'text' : 'HeartRate' , 'className' : 'heart_rate' }
    ])

    let svg = container
        .select('svg')
        .attr('viewBox', [0, 0, width, height + 30])
        .classed('sleepHeartRate', true)

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

    // Add in asleep indicators
    let asleepIndicators = svg.selectAll('.sleep')
        .data(asleepData)
        .join('g')
        .attr('transform', function(d) {
            return 'translate(' + dateRange(d['start']) + ',0)'
        })

    let asleepBoxes = asleepIndicators.append('rect')
        .attr('width', function(d) {
            return dateRange(d['end']) - dateRange(d['start'])
        })
        .attr('height', height)
        .classed('sleep', true)
        .classed('bar', true)

    asleepIndicators.append('text')
    .attr('x', function(d) {
        let width = dateRange(d['end']) - dateRange(d['start'])
        return width/2
    })
    .attr('y', height)
    .attr('dy', 20)
    .attr('text-anchor', 'middle')
    .text(function(d) {
        let durationMS = d.end - d.start
        let durationS = durationMS / 1000
        let durationH = durationS / 3600
        return durationH.toFixed(1)
    })
    .classed('text2', true)
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

    let lastHeartRate = heartRate[heartRateCount-1]['Avg']

    // Add in heart rate readings
    let heartRateIndicator = svg.selectAll('.heart_rate')
        .data(heartRate)
        .join('circle')
        .attr('cx', function(d) {
            return dateRange(dateFromHealthExportDateString(d['date']))
        })
        .attr('cy', function(d) {
            return heartRateRange(d['Avg'])
        })
        .attr('r', 3)
        .style('animation-delay', function(d,i) {
            return i * lastHeartRate * 0.25 + 'ms';
        })
        .style('animation-duration', lastHeartRate * 25 + 'ms')
        .classed('heart_rate', true)

    return container.node()
}

function heartRateVariability(dataByName, dateRange) {
    let width = 1000
    let height = 80
    let heartRateVariability = dataByName['heart_rate_variability'].data

    let container = svgContainer([
        { 'text' : 'HRV', 'className' : 'heart_rate_variability' },
    ])

    let svg = container
        .select('svg')
        .attr('viewBox', [0, 0, width, height])

    // Find HRV range
    let hrvMin = d3.min(heartRateVariability, function(d) { return d['qty'] })
    let hrvMax = d3.max(heartRateVariability, function(d) { return d['qty'] })
    let hrvRange = d3.scaleLinear()
    .domain([hrvMin, hrvMax])
    .range([0, height])

    // Add in lines for the HRV
    let hrvIndicator = svg.selectAll('.heart_rate_variability')
        .data(heartRateVariability)
        .join('rect')
        .attr('x', function(d) {
            let date = dateFromHealthExportDateString(d['date'])
            return dateRange(date)
        })
        .attr('width', 4)
        .attr('y', function(d) {
            return (height - hrvRange(d['qty']))/2
        })
        .attr('height', function(d) {
            return hrvRange(d['qty'])
        })
        .classed('bar', true)
        .classed('heart_rate_variability', true)

    return container.node()
}

function moveExerciseStand(dataByName, dateRange, earliestDate, latestDate) {
    let width = 1000
    let height = 80

    let hourCount = Math.round(((latestDate - earliestDate) / 1000) / 3600)

    let dimensionX = width / hourCount
    let dimensionY = height / 3

    let move = dataByName['active_energy']['data']
    let exercise = dataByName['apple_exercise_time']['data']
    let stand = dataByName['apple_stand_time']['data']

    let moveScale = d3.scaleLog()
    .domain([d3.min(move, x => x['qty']), d3.max(move, x => x['qty'])])
    .range([0.4, 1.0])

    let exerciseScale = d3.scalePow()
    .domain([d3.min(exercise, x => x['qty']), d3.max(exercise, x => x['qty'])])
    .range([0.4, 1.0])

    let standScale = d3.scaleLog()
    .domain([d3.min(stand, x => x['qty']), d3.max(stand, x => x['qty'])])
    .range([0.4, 1.0])

    function dateRoundedToHour(date) {
        var out = new Date(date.getTime())
        date.setMinutes(0)
        date.setSeconds(0)
        return out
    }

    let container = svgContainer([
        { 'text' : 'Move', 'className' : 'active_energy' },
        { 'text' : 'Exercise', 'className' : 'apple_exercise_time' },
        { 'text' : 'Stand', 'className' : 'apple_stand_time' },
    ])
    let svg = container
        .select('svg')
        .attr('viewBox', [0, 0, width, height])

    let moveTime = svg.selectAll('.active_energy')
        .data(move)
        .join('rect')
        .attr('x', function(d) {
            var date = dateRoundedToHour(dateFromHealthExportDateString(d['date']))
            return dateRange(date)
        })
        .attr('width', dimensionX)
        .attr('height', dimensionY)
        .attr('fill-opacity', function(d) {
            return moveScale(d['qty'])
        })
        .classed('active_energy', true)

    let exerciseTime = svg.selectAll('.apple_exercise_time')
        .data(exercise)
        .join('rect')
        .attr('x', function(d) {
            var date = dateRoundedToHour(dateFromHealthExportDateString(d['date']))
            return dateRange(date)
        })
        .attr('y', dimensionY)
        .attr('width', dimensionX)
        .attr('height', dimensionY)
        .attr('fill-opacity', function(d) {
            return exerciseScale(d['qty'])
        })
        .classed('apple_exercise_time', true)

    let standHour = svg.selectAll('.apple_stand_time')
        .data(exercise)
        .join('rect')
        .attr('x', function(d) {
            var date = dateRoundedToHour(dateFromHealthExportDateString(d['date']))
            return dateRange(date)
        })
        .attr('y', 2 * dimensionY)
        .attr('width', dimensionX)
        .attr('height', dimensionY)
        .attr('fill-opacity', function(d) {
            return standScale(d['qty'])
        })
        .classed('apple_stand_time', true)

    return container.node()
}

function weight(dataByName) {
    let dimension = 100

    var weight = dataByName['weight_body_mass']
    if (weight != null) {
        weight = weight['data'][weight['data'].length-1]['qty']
    }
    else {
        weight = '?'
    }

    let container = d3.create('svg')
        .classed('container', true)
        .attr('viewBox', [0, 0, dimension, dimension])
    
    let background = container.append('circle')
    .attr('cx', dimension/2)
    .attr('cy', dimension/2)
    .attr('r', dimension/2)
    .classed('glanceBackground', true)
    .classed('weight_body_mass', true)

    let text = container.append('text')
    .attr('x', dimension/2)
    .attr('y', dimension/2)
    .attr('dy', 5)
    .attr('text-anchor', 'middle')
    .text(weight)

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
        .range([0, 1000])

    // Group data by name
    var dataByName = { }
    for (const itemIndex in metrics) {
        let metricItem = metrics[itemIndex]
        let data = metricItem['data']
        if (data.length > 0) {
            let name = metricItem['name']
            dataByName[name] = metricItem
        }
    }

    console.log(dataByName)

    let intakeContainer = document.getElementById('intakeContainer')
    let bodyContainer = document.getElementById('bodyContainer')
    let glanceContainer = document.getElementById('glanceContainer')

    intakeContainer.appendChild(nutrition(dataByName))

    bodyContainer.appendChild(sleepHeartRate(dataByName, dateRange))
    bodyContainer.appendChild(moveExerciseStand(dataByName, dateRange, earliestDate, latestDate))
    bodyContainer.appendChild(heartRateVariability(dataByName, dateRange))

    glanceContainer.appendChild(weight(dataByName))
}

window.onload = function() {
    let dataElement = document.getElementById('data')
    data = JSON.parse(dataElement.innerHTML)
    update(data)
}
