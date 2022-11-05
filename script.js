// Constants
let fatCaloriesPerGram = 9
let carbsCaloriesPerGram = 4
let proteinCaloriesPerGram = 4
let moveGoal = 440
let exerciseGoal = 30
let standGoal = 12

let specs = {

}

specs.colors = {
    "active_energy" : "rgb(252, 48, 130)",
    "apple_exercise_time" : "rgb(172, 251, 5)",
    "apple_stand_hour" : "rgb(8, 246, 210)",
    "background" : "#000d2a"
}

let scene = new THREE.Scene()
scene.background = new THREE.Color(specs.colors.background)
let camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 10000)
camera.position.z = 1000
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

// Returns a group representing activity rings
function activityRings(move, exercise, stand) {
    let activity = new THREE.Group()
    let moveRadius = move.sum / moveGoal * Math.PI * 2
    let exerciseRadius = exercise.sum / exerciseGoal * Math.PI * 2
    let standRadius = stand.sum / standGoal * Math.PI * 2

    function activityRing(arc, level, color, rotateFunc) {
        let geo = new THREE.TorusGeometry(100 - (level * 30), 10, 80, 60, arc)
        let material = new THREE.MeshPhysicalMaterial({color: new THREE.Color(color)})
        let node = new THREE.Mesh(geo, material)
        return node
    }

    activity.add(activityRing(moveRadius, 0, specs.colors.active_energy, function() {}))
    activity.add(activityRing(exerciseRadius, 1, specs.colors.apple_exercise_time, function() {}))
    activity.add(activityRing(standRadius, 2, specs.colors.apple_stand_hour, function() {}))

    return activity
}

function update(dataContents) {
    let data = dataContents['data']
    let metrics = data['metrics']
    let workouts = data['workouts']

    var metricsByType = {}
    for (var metric of metrics) {
        metricsByType[metric.name] = metric
    }

    let move = aggregateDataByDay(metricsByType.active_energy)
    let exercise = aggregateDataByDay(metricsByType.apple_exercise_time)
    let stand = aggregateDataByDay(metricsByType.apple_stand_hour)

    container.add(activityRings(move[0], exercise[0], stand[0]))
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
