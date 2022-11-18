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

    var out = new Array()
    var currentDateTime = 0
    var currentItem = null

    for (var datum of data) {
        var datumDate = dateStrippingTimeComponents(dateFromHealthExportDateString(datum['date']))
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

function cube(color) {
    let geo = new THREE.BoxGeometry(100, 100, 100)
    let mat = new THREE.MeshBasicMaterial({color: color})
    return new THREE.Mesh(geo, mat)
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

    state.upperRight.position.x = width
    state.lowerLeft.position.y = height
    state.lowerRight.position.x = width
    state.lowerRight.position.y = height
}

function applyDayData(data) {
    // Heart rate
    let heartRateContainer = document.getElementById("heartRateContainer")
    let heartRateData = data.heart_rate
    let heartRateVariabilityData = data.heart_rate_variability
    console.log(heartRateData)
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
    let upperLeft = cube('red')
    let upperRight = cube('green')
    let lowerLeft = cube('blue')
    let lowerRight = cube('yellow')

    container.add(upperLeft)
    container.add(upperRight)
    container.add(lowerLeft)
    container.add(lowerRight)
    
    state.upperLeft = upperLeft
    state.upperRight = upperRight
    state.lowerLeft = lowerLeft
    state.lowerRight = lowerRight

    DataTypes.install(container)
    updateBirthOffset()
}

window.onload = function() {
    setup()
    reload()
    animate()
}

window.onresize = layout

