// Constants
let fatCaloriesPerGram = 9
let carbsCaloriesPerGram = 4
let proteinCaloriesPerGram = 4
let moveGoal = 440
let exerciseGoal = 30
let standGoal = 12
let waterGoal = 100

let specs = { }

specs.colors = {
    "active_energy" : "rgb(252, 48, 130)",
    "apple_exercise_time" : "rgb(172, 251, 5)",
    "apple_stand_hour" : "rgb(8, 246, 210)",
    "background" : "#000d2a"
}

var state = { }
state.hitObjects = [ ]
state.raycaster = new THREE.Raycaster()
state.pointer = new THREE.Vector2()

let scene = new THREE.Scene()
scene.background = new THREE.Color(specs.colors.background)
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

function linesNode(geo, color) {
    let linesMaterial = new THREE.LineBasicMaterial({color: new THREE.Color(color)})
    linesMaterial.transparent = true
    linesMaterial.linewidth = 4
    let lines = new THREE.LineSegments(geo, linesMaterial)
    return lines
}

function outlinedNode(geo, color) {
    let out = new THREE.Group()
    let regularMaterial = new THREE.MeshPhysicalMaterial({color: new THREE.Color(color)})
    regularMaterial.opacity = 0.2
    let regular = new THREE.Mesh(geo, regularMaterial)
    out.add(linesNode(geo, color))
    out.add(regular)
    return out
}

function cube(color) {
    let geo = new THREE.BoxGeometry(100, 100, 100)
    let mat = new THREE.MeshBasicMaterial({color: new THREE.Color(color)})
    return new THREE.Mesh(geo, mat)
}

// Returns a group representing activity rings
function activityRings(move, exercise, stand) {
    let activity = outlinedNode(new THREE.SphereGeometry(120, 24, 24), "rgb(100, 100, 100)")
    activity.userData.hitTest = true
    activity.rotation.x = Math.PI / 2
    let moveArc = move.sum / moveGoal * Math.PI * 2
    let exerciseArc = exercise.sum / exerciseGoal * Math.PI * 2
    let standArc = stand.sum / standGoal * Math.PI * 2

    function activityRing(arc, level, color, rotated) {
        let clampedArc = Math.min(arc, Math.PI * 2)
        let geo = new THREE.TorusGeometry(100 - (level * 30), 10, 8, 16 * (arc / Math.PI*2), clampedArc)
        let node = outlinedNode(geo, color)

        let rotate = new TWEEN.Tween(node.rotation)
        .to(rotated, 5000 + (Math.random() * 1000))
        .repeat(Infinity)
        .delay(Math.random() * 1000)
        .repeatDelay(0)
        .start()

        return node
    }

    let dest = Math.PI * 2
    activity.add(activityRing(moveArc, 0, specs.colors.active_energy, { x : dest, y: dest }))
    activity.add(activityRing(exerciseArc, 1, specs.colors.apple_exercise_time, { y : dest, z: dest }))
    activity.add(activityRing(standArc, 2, specs.colors.apple_stand_hour, { z : dest, x: dest }))

    return activity
}

function waterIndicator(data) {
    let water = new THREE.Group()
    let goal = outlinedNode(new THREE.CylinderGeometry(50, 50, waterGoal, 20), "rgb(200, 200, 200)")
    water.add(goal)
    let current = outlinedNode(new THREE.CylinderGeometry(40, 40, data.sum, 20), "rgb(53, 141, 220)")
    water.add(current)

    let rotate = new TWEEN.Tween(water.rotation)
    .to({
        x: Math.PI * 2,
        y: Math.PI * 4,
        z: Math.PI * 6 
    }, 8000)
    .repeat(Infinity)
    .delay(Math.random() * 1000)
    .repeatDelay(0)
    .start()

    return water
}

function layout() {
    let width = window.innerWidth
    let height = window.innerHeight

    container.position.x = -width/2
    container.position.y = -height/2
    // container.rotation.x = Math.PI

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

    state.ringsContainer.position.x = width/2
    state.ringsContainer.position.y = height - 300/2
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
    for (var metricType of Object.keys(metricsByType)) {
        let metric = metricsByType[metricType]
        let aggregated = aggregateDataByDay(metric)
        for (var day of aggregated) {
            if (metricsByDay[day.date] == null) {
                metricsByDay[day.date] = { }
            }
            metricsByDay[day.date][metricType] = day
        }
    }

    let daysSorted = Object.keys(metricsByDay)
    daysSorted.sort((a, b) => {
        let aDate = new Date(a)
        let bDate = new Date(b)
        return aDate.getTime() > bDate.getTime()
    })

    var offsetY = 0
    for (var day of daysSorted) {
        let dayData = metricsByDay[day]
        let dayContainer = new THREE.Group()
        container.add(dayContainer)
        let rings = activityRings(dayData.active_energy, dayData.apple_exercise_time, dayData.apple_stand_hour)
        dayContainer.add(rings)
        let water = waterIndicator(dayData.dietary_water)
        water.position.x = 300
        dayContainer.add(water)

        dayContainer.position.x = 150
        dayContainer.position.y = 150 + offsetY
        offsetY += 300
    }

    let ringsContainer = new THREE.Group()
    container.add(ringsContainer)
    state.ringsContainer = ringsContainer

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

    layout()
}

async function doLoad() {
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
    requestAnimationFrame( animate )
    TWEEN.update()
    renderer.render(scene, camera)
}

window.onload = function() {
    doLoad()
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

