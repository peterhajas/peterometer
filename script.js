import * as DataTypes from './data_types.js'
import * as ThreeJSMatching from './threejs_matching.js'

// Constants
let fatCaloriesPerGram = 9
let carbCaloriesPerGram = 4
let proteinCaloriesPerGram = 4
let moveGoal = 440
let exerciseGoal = 30
let standGoal = 12
let waterGoal = 100
let calorieGoal = 2352
let birthday = new Date("October 27, 1989 14:30:00")

var state = { }

let scene = new THREE.Scene()
scene.background = new THREE.Color(window.getComputedStyle(document.body).backgroundColor);
let camera = new THREE.OrthographicCamera(0,0,0,0,0,10000)
let container = new THREE.Group()
scene.add(container)
let renderer = new THREE.WebGLRenderer({
    logarithmicDepthBuffer : true
})
let ambient = new THREE.AmbientLight(0x404040, 3)
scene.add(ambient)
let light = new THREE.DirectionalLight(0x404040, 5)
light.position.set(0,0,1000)
scene.add(light)

let daysOfTheWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.domElement.className = "renderer"
document.body.appendChild(renderer.domElement)

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function pad(number) {
    if (number < 10) {
        let out = "0" + Number(number).toString()
        return out
    }
    return number
}


function allNodes() {
    function nodesUnder(node) {
        var under = new Array()
        under.push(node)
        for (var child of node.children) {
            under.push(child)
            for (var inChild of nodesUnder(child)) {
                under.push(inChild)
            }
        }
        return under
    }

    var unique = nodesUnder(container).filter((v, i, a) => a.indexOf(v) === i);
    return unique
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

    var outDate = new Date(date)

    outDate.setDate(outDate.getDate() + 1)
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
/// - average - an average of the data for this day
function aggregateDataByDay(metricItem) {
    let data = metricItem['data']
    let unit = metricItem.units

    var out = new Array()
    var currentDateTime = 0
    var currentItem = null

    for (var datum of data) {
        var datumDate = dateStrippingTimeComponents(dateFromHealthExportDateString(datum['date']))
        datum.date = dateFromHealthExportDateString(datum.date)
        if (currentDateTime != datumDate.getTime()) {
            if (currentItem != null) {
                currentItem.average = currentItem.sum / currentItem.data.length
                out.push(currentItem)
            }
            currentDateTime = datumDate.getTime()
            currentItem = { }
            currentItem['date'] = datumDate
            currentItem['data'] = new Array()
            currentItem['sum'] = 0
            currentItem['average'] = 0
            currentItem['min'] = 100000000
            currentItem['max'] = -1 * currentItem['min']
            currentItem['unit'] = unit
        }
        else {
            currentItem['data'].push(datum)
            currentItem['sum'] = currentItem['sum'] + datum['qty']
            currentItem['min'] = Math.min(currentItem.min, datum['qty'])
            currentItem['max'] = Math.max(currentItem.max, datum['qty'])
        }
    }

    return out
}

function prettyUnit(unitName) {
    var out = unitName.replace('count', '')
    return out
}

function waterIndicator(data) {
    let water = new THREE.Group()
    let goal = linesNode(new THREE.CylinderGeometry(50, 50, waterGoal, 4), colorVariable("bg2"))
    water.add(goal)
    let current = outlinedNode(new THREE.CylinderGeometry(40, 40, data.sum, 20), colorVariable("tint1"))
    water.add(current)

    return water
}

function nutritionIndicator(fat, carb, protein, kcal, cholesterol, sugar, fiber, saturated, sodium) {
    // also needs:
    // dietary_cholesterol
    // dietary_sugar
    // fiber
    // saturated_fat
    // sodium
    
    let nutrition = new THREE.Group()

    let goal = linesNode(new THREE.BoxGeometry(85, 200, 85, 2, 2, 2), colorVariable("bg2"))
    nutrition.add(goal)

    function kcalsToUnits(kcals) {
        return kcals * (200 / calorieGoal)
    }

    var calories = 0
    if (kcal != null) {
        calories = kcal.sum
    }
    let calFraction = calories / calorieGoal
    let cal = outlinedNode(new THREE.BoxGeometry(45, calFraction * 200, 45), colorVariable("bg3"))
    nutrition.add(cal)

    var fatGrams = 0
    if (fat != null) {
        fatGrams = fat.sum
    }
    let fatCalories = fatGrams * fatCaloriesPerGram
    let fatNode = outlinedNode(new THREE.BoxGeometry(77, kcalsToUnits(fatCalories), 77, 3, 3, 3), colorVariable("tint1"))
    nutrition.add(fatNode)

    var carbGrams = 0
    if (carb != null) {
        carbGrams = carb.sum
    }
    let carbCalories = carbGrams * carbCaloriesPerGram
    let carbNode = outlinedNode(new THREE.BoxGeometry(77, kcalsToUnits(carbCalories), 77, 3, 3, 3), colorVariable("tint2"))
    nutrition.add(carbNode)
    
    var proteinGrams = 0
    if (protein != null) {
        proteinGrams = protein.sum
    }
    let proteinCalories = proteinGrams * proteinCaloriesPerGram
    let proteinNode = outlinedNode(new THREE.BoxGeometry(77, kcalsToUnits(proteinCalories), 77, 3, 3, 3), colorVariable("tint3"))
    nutrition.add(proteinNode)

    let totalHeight = kcalsToUnits(fatCalories + carbCalories + proteinCalories)
    fatNode.position.y -= ((totalHeight) - kcalsToUnits(fatCalories))/2
    carbNode.position.y = fatNode.position.y + kcalsToUnits(fatCalories)/2 + kcalsToUnits(carbCalories)/2
    proteinNode.position.y = carbNode.position.y + kcalsToUnits(carbCalories)/2 + kcalsToUnits(proteinCalories)/2

    let totalSodium = (sodium == null) ? 0 : sodium.sum
    let sodiumNode = outlinedNode(new THREE.IcosahedronGeometry(totalSodium/300), colorVariable("tint1"))
    sodiumNode.position.x = 80
    let sodiumContainer = new THREE.Group()
    sodiumContainer.add(sodiumNode)

    nutrition.add(sodiumContainer)

    return nutrition
}

function layout() {
    let width = window.innerWidth
    let height = window.innerHeight

    container.position.x = -width/2
    container.position.y = -height/2

    // update camera and renderer
    camera.position.z = 1000 * height / width
    camera.top = -height / 2
    camera.bottom = height / 2
    camera.left = -width / 2
    camera.right = width / 2
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    renderer.domElement.width = width
    renderer.domElement.height = height
}

function updateLabel(selector, newValue) {
    let current = Number.parseFloat(document.querySelector(selector).innerHTML)
    var target = {"target" : current }
    let tween = new TWEEN.Tween(target)
    .to({target: newValue}, 200)
    .onUpdate(() => {
        document.querySelector(selector).innerHTML = Number(target.target).toFixed(1)
    })
    .start()
}

function updateNode(node, destination) {
    let tween = new TWEEN.Tween(node)
    .to(destination, 200)
    .start()

    return tween
}

function ensureNodeCount(parent, count, create) {
    let childDifference = count - parent.children.length

    for(var i = 0; i < childDifference; i++) {
        if (childDifference > 0) {
            let newChild = create()
            parent.add(newChild)
        }
        else {
            parent.children[0].removeFromParent()
        }
    }
}

function fraction(interval, value) {
    let diffFromMax = interval.max - value
    let fraction = diffFromMax / (interval.max - interval.min)
    return fraction
}

function bounds(data, accessor) {
    var min = Infinity
    var max = -Infinity
    for (var item of data) {
        let value = accessor(item)
        if (value < min) { min = value }
        if (value > max) { max = value }
    }
    return { min: min, max: max }
}

function combineBounds(a, b) {
    return bounds([a.min, a.max, b.min, b.max], function(e) { return e })
}

function dateBounds(data, accessor) {
    return bounds(data, function(e) {
        return accessor(e).getTime()
    })
}

function updateHeartRate(data) {
    let heartContainer = document.getElementById("heartContainer")
    let heartRateData = data.heart_rate
    let heartRateVariabilityData = data.heart_rate_variability

    var heartRateBounds = {}
    heartRateBounds.min = bounds(heartRateData.data, function(e) { return e.Min }).min
    heartRateBounds.max = bounds(heartRateData.data, function(e) { return e.Max }).max

    let heartRateVariabilityBounds = bounds(heartRateVariabilityData.data, function(e) { return e.qty })

    let heartRateDateBounds = dateBounds(heartRateData.data, function(e) {
        return e.date
    })

    let heartRateVariabilityDateBounds = dateBounds(heartRateVariabilityData.data, function(e) {
        return e.date
    })

    let heartDateBounds = combineBounds(heartRateDateBounds, heartRateVariabilityDateBounds)

    let lastHeartRate = heartRateData.data[heartRateData.data.length-1].Avg
    updateLabel("#heart_rate .data", lastHeartRate)
    
    let lastHRV = heartRateVariabilityData.data[heartRateVariabilityData.data.length-1].qty
    updateLabel("#heart_rate_variability .data", lastHRV)

    var heartRateNode = state.heartRateNode
    if (heartRateNode == null) {
        heartRateNode = new THREE.Group()
        heartRateNode.name = "heart_rate"
        heartRateNode.userData.matchSelector = "#heart_rate .graph"
        state.heartRateNode = heartRateNode
        container.add(state.heartRateNode)
    }

    var heartRateVariabilityNode = state.heartRateVariabilityNode
    if (heartRateVariabilityNode == null) {
        heartRateVariabilityNode = new THREE.Group()
        heartRateVariabilityNode.name = "heart_rate_variability"
        heartRateVariabilityNode.userData.matchSelector = "#heart_rate_variability .graph"
        state.heartRateVariabilityNode = heartRateVariabilityNode
        container.add(state.heartRateVariabilityNode)
    }

    ensureNodeCount(heartRateNode, heartRateData.data.length, function() {
        let newChild = new THREE.Group()
        let sphereRadius = 5
        let sphereWidthSegments = 6
        let sphereHeightSegments = sphereWidthSegments
        newChild.name = "heartRate" + i
        let top = outlinedNode(new THREE.SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments), colorVariable("tint1"))
        top.name = "top"
        top.userData.unitY = 0
        let avg = outlinedNode(new THREE.SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments), colorVariable("tint1"))
        avg.name = "avg"
        avg.userData.unitY = 0
        let bot = outlinedNode(new THREE.SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments), colorVariable("tint1"))
        bot.name = "bot"
        bot.userData.unitY = 0
        newChild.add(top)
        newChild.add(avg)
        newChild.add(bot)
        newChild.userData.top = top
        newChild.userData.avg = avg
        newChild.userData.bot = bot
        return newChild
    })

    for(var i = 0; i < heartRateData.data.length; i++) {
        let heartRateEntry = heartRateData.data[i]
        let node = heartRateNode.children[i]
        node.userData.unitX = fraction(heartDateBounds, heartRateEntry.date.getTime())
        updateNode(node.userData.avg.userData, { unitY : fraction(heartRateBounds, heartRateEntry.Avg) })
        updateNode(node.userData.top.userData, { unitY : fraction(heartRateBounds, heartRateEntry.Max) })
        updateNode(node.userData.bot.userData, { unitY : fraction(heartRateBounds, heartRateEntry.Min) })
    }

    ensureNodeCount(heartRateVariabilityNode, heartRateVariabilityData.data.length, function() {
        let newChild = new THREE.Group()
        let sphereRadius = 8
        let sphereWidthSegments = 6
        let sphereHeightSegments = sphereWidthSegments
        let node = outlinedNode(new THREE.SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments), colorVariable("tint2"))
        node.name = "hrv"
        newChild.add(node)
        newChild.userData.unitX = 0
        newChild.userData.unitY = 0
        return newChild
    })

    for(var i = 0; i < heartRateVariabilityData.data.length; i++) {
        let entry = heartRateVariabilityData.data[i]
        let node = heartRateVariabilityNode.children[i]
        updateNode(node.userData, { unitX : fraction(heartDateBounds, entry.date.getTime()) })
        updateNode(node.userData, { unitY : fraction(heartRateVariabilityBounds, entry.qty) })
    }
}

function updateActivity(data) {
    let activityRadius = 60
    let activityTube = 5
    let activitySpacing = 20
    function clamp(arc) {
        let clampedArc = Math.max(0, Math.min(arc, Math.PI * 2))
        return clampedArc
    }

    function activityRing(arc, level, color) {
        let clampedArc = Math.max(0, Math.min(arc, Math.PI * 2))
        let geo = new THREE.TorusGeometry(activityRadius - (level * activitySpacing), activityTube, 8, 16 * (arc / Math.PI*2), clampedArc)
        let node = outlinedNode(geo, color)
        node.rotation.z = -Math.PI/2
        node.userData.arc = 0

        return node
    }

    function updateRing(level, ring, arc) {
        let clampedArc = Math.max(0, Math.min(arc, Math.PI * 2))
        let geo = new THREE.TorusGeometry(activityRadius - (level * activitySpacing), activityTube, 8, 16 * (arc / Math.PI*2), clampedArc)
        ring.userData.arc = clampedArc
        ring.children[0].geometry = geo
        ring.children[1].geometry = geo
    }

    function ringArc(ring) {
        return ring.userData.arc
    }

    let moveArc = clamp((data.active_energy.sum / moveGoal) * Math.PI * 2)
    let exerciseArc = clamp((data.apple_exercise_time.sum / exerciseGoal) * Math.PI * 2)
    let standArc = clamp((data.apple_stand_hour.sum / standGoal) * Math.PI * 2)

    let activityNode = state.activityNode
    if (activityNode == null) {
        activityNode = new THREE.Group()
        activityNode.name = "activity"
        activityNode.userData.matchSelector = "#activityContainer .graph"

        let move = activityRing(1, 0, colorVariable("tint1"))
        let exercise = activityRing(1, 1, colorVariable("tint2"))
        let stand = activityRing(1, 2, colorVariable("tint3"))
        activityNode.userData.move = move
        activityNode.add(move)
        activityNode.userData.exercise = exercise
        activityNode.add(exercise)
        activityNode.userData.stand = stand
        activityNode.add(stand)

        state.activityNode = activityNode
        container.add(activityNode)
    }

    var activity = { move: ringArc(activityNode.userData.move), exercise: ringArc(activityNode.userData.exercise), stand: ringArc(activityNode.userData.stand) }
    var activityTarget = { move: moveArc, exercise: exerciseArc, stand: standArc }

    updateNode(activity, activityTarget)
    .onUpdate(() => {
        updateRing(0, activityNode.userData.move, activity.move)
        updateRing(1, activityNode.userData.exercise, activity.exercise)
        updateRing(2, activityNode.userData.stand, activity.stand)
    })
    
    updateLabel("#activityContainer #active_energy .data", data.active_energy.sum)
    updateLabel("#activityContainer #apple_exercise_time .data", data.apple_exercise_time.sum)
    updateLabel("#activityContainer #apple_stand_hour .data", data.apple_stand_hour.sum)
}

function applyDayData(data) {
    updateHeartRate(data)
    updateActivity(data)
}

function changeCurrentDate(day) {
    state.currentDate = day

    let dayEntries = document.getElementsByClassName("day")
    for (var i = 0; i < dayEntries.length; i++) {
        let dayEntry = dayEntries[i]
        let dayEntryDate = new Date(dayEntry.dataset.date)
        if (dayEntryDate.getTime() == state.currentDate.getTime()) {
            dayEntry.classList.add("selected")
            dayEntry.classList.remove("unselected")
        } else {
            dayEntry.classList.remove("selected")
            dayEntry.classList.add("unselected")
        }
    }

    applyDayData(state.metricsByDay[day])
}

function datesChanged(days) {
    state.days = days

    let daysPicker = document.getElementById("daysPicker")
    daysPicker.innerHTML = ""
    for (var day of days) {
        let date = pad(day.getDate())
        let dayOfWeekNumber = day.getDay()
        let dayOfWeek = daysOfTheWeek[dayOfWeekNumber].substring(0, 3)
        let dayEntry = document.createElement("div")
        dayEntry.className = "day"
        let label = document.createElement("div")
        label.className = "label"
        label.innerHTML = dayOfWeek
        let data = document.createElement("div")
        data.className = "data"
        data.innerHTML = date
        dayEntry.appendChild(label)
        dayEntry.appendChild(data)
        dayEntry.dataset.date = day
        daysPicker.appendChild(dayEntry)

        let newDate = new Date(day)

        dayEntry.onclick = function(e) {
            changeCurrentDate(newDate)
        }
    }
}

function update(dataContents) {
    let data = dataContents['data']
    let metrics = data['metrics']
    let workouts = data['workouts']

    var metricsByType = {}
    for (var metric of metrics) {
        metricsByType[metric.name] = metric
    }

    var metricsByDay = {}
    var days = [ ]
    for (var metricType of Object.keys(metricsByType)) {
        let metric = metricsByType[metricType]
        let aggregated = aggregateDataByDay(metric)
        for (var day of aggregated) {
            if (metricsByDay[day.date] == null) {
                metricsByDay[day.date] = { }
                days.push(day.date)
            }
            metricsByDay[day.date][metricType] = day
        }
    }

    days.sort((a, b) => {
        return a.getTime() > b.getTime()
    })

    datesChanged(days)

    state.metricsByDay = metricsByDay
    state.currentDate = days[days.length-1]
    changeCurrentDate(state.currentDate);

    layout()
}

function updateBirthOffset() {
    let nowSeconds = new Date().getTime()/1000
    let birthdaySeconds = birthday.getTime()/1000

    let difference = nowSeconds - birthdaySeconds
    let differenceSeconds = nowSeconds - birthdaySeconds
    let differenceMinutes = Math.floor(differenceSeconds / 60)
    let differenceHours = Math.floor(differenceMinutes / 60)
    let differenceDays = Math.floor(differenceHours / 24)
    let differenceYears = Math.floor(differenceDays / 365)

    var yearsDifference = differenceYears
    var daysDifference = differenceDays - (yearsDifference*365)
    var hoursDifference = differenceHours - (yearsDifference*365*24 + daysDifference*24)
    var minutesDifference = differenceMinutes - (yearsDifference*365*24*60 + daysDifference*24*60 + hoursDifference*60)
    var secondsDifference = Math.floor(differenceSeconds - (yearsDifference*365*24*60*60 + daysDifference*24*60*60 + hoursDifference*60*60 + minutesDifference*60))

    yearsDifference = pad(yearsDifference)
    daysDifference = pad(daysDifference)
    hoursDifference = pad(hoursDifference)
    minutesDifference = pad(minutesDifference)
    secondsDifference = pad(secondsDifference)

    let overall = yearsDifference
        + ":" + daysDifference
        + ":" + hoursDifference
        + ":" + minutesDifference
        + ":" + secondsDifference
    document.getElementById("ageIndicator").innerHTML = overall
}

async function reload() {
    let request = new Request('data.php')
    fetch(request)
    .then(response => {
        return response.json()
    })
    .then(json => {
        update(json)
    })

}

function animate() {
    requestAnimationFrame(animate)
    ThreeJSMatching.matchLayout(container)
    TWEEN.update()
    renderer.render(scene, camera)
    updateBirthOffset()
}

function setup() {
    DataTypes.install(container)
    updateBirthOffset()
}

window.onload = function() {
    setup()
    reload()
    animate()
}

window.onresize = layout

