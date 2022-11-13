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

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.domElement.className = "renderer"
document.body.appendChild(renderer.domElement)

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
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
function aggregateDataByDay(metricItem) {
    let data = metricItem['data']

    var out = new Array()
    var currentDateTime = 0
    var currentItem = null

    for (var datum of data) {
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

function currentDateChanged() {
    let metricsBrowser = document.getElementById("metricsBrowser")
    metricsBrowser.innerHTML = ""

    let dayIndicator = document.getElementById("currentDayIndicator")
    let formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' })
    let dateString = formatter.format(state.currentDate)
    dayIndicator.innerHTML = dateString

    let currentMetrics = state.metricsByDay[state.currentDate] 

    DataTypes.updateForDay(currentMetrics, metricsBrowser)
}

function changeCurrentDate(by) {
    var index = state.days.indexOf(state.currentDate)
    index = index + by
    index = index % state.days.length
    state.currentDate = state.days[index]
    currentDateChanged()
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

    state.days = days

    state.metricsByDay = metricsByDay
    state.currentDate = days[days.length-1]
    currentDateChanged()

    layout()
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
}

function setup() {
    state.hitObjects = [ ]
    state.raycaster = new THREE.Raycaster()
    state.pointer = new THREE.Vector2()

    document.getElementById("previousDayButton").onclick = function(e) {
        changeCurrentDate(-1)
    }
    document.getElementById("nextDayButton").onclick = function(e) {
        changeCurrentDate(1)
    }
    
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
}

window.onload = function() {
    setup()
    reload()
    animate()
}

window.onresize = layout
window.addEventListener('pointermove', function(e) {
    state.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    state.pointer.y = - (e.clientY / window.innerHeight) * 2 + 1
    state.raycaster.setFromCamera(state.pointer, camera)
    var intersections = state.raycaster.intersectObjects(allNodes())
    var hitObjects = new Array()
    for (var intersection of intersections) {
        var cursor = intersection.object
        while (cursor != null) {
            if (cursor.userData == null) { break }
            if (cursor.userData.hitTest) {
                hitObjects.push(cursor)
                break
            }
            cursor = cursor.parent
        }
    }
    state.hitObjects = hitObjects.filter(onlyUnique)
    layout()
})

