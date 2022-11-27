import * as ThreeJSMatching from './threejs_matching.js'

// Constants
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

function showTooltip(e, metricKind) {
    let node = document.getElementById(metricKind)
    let tooltipElement = document.getElementById("tooltip")
    if (node != null) {
        let unit = node.dataset.unit
        let value = document.querySelector("#" + metricKind + " .data").innerHTML
        var name = node.dataset.name
        if (name == null) {
            name = metricKind
        }
        name = name.replaceAll("_", " ")

        let tooltip = name + " : " + value + " " + unit
        tooltipElement.innerHTML = tooltip
        let tooltipRect = tooltipElement.getBoundingClientRect()

        let padding = 5

        var left = padding + e.clientX
        var top = padding + e.clientY

        let eventX = e.clientX
        let eventY = e.clientY
        let width = document.documentElement.scrollWidth
        let height = document.documentElement.scrollHeight

        if (eventX > width / 2) {
            left -= tooltipRect.width + padding * 2
        }
        if (eventY > height / 2) {
            top -= tooltipRect.height + padding * 2
        }

        let horizontal = Number(1 + left).toString() + "px"
        let vertical = Number(1 + top).toString() + "px"

        tooltipElement.style.left = horizontal
        tooltipElement.style.top = vertical
    }
    else {
        document.getElementById("tooltip").innerHTML = ""
        tooltipElement.style.left = "-1000px"
        tooltipElement.style.top = "-1000px"
    }
}

function layout() {
    let width = document.documentElement.scrollWidth
    let height = document.documentElement.scrollHeight

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

function defaultTween(from, to) {
    return new TWEEN.Tween(from)
    .to(to, 600)
    .easing(TWEEN.Easing.Cubic.InOut)
}

function pulseTween(from, to, duration) {
    return new TWEEN.Tween(from)
    .to(to, duration)
    .repeat(Infinity)
    .start()
}

function updateLabel(selector, newValue) {
    var showUnknown = false
    if (newValue == null || isNaN(newValue)) {
        showUnknown = true
        newValue = 0
    }
    let current = Number.parseFloat(document.querySelector(selector).innerHTML)
    if (showUnknown && document.querySelector(selector).innerHTML == "?") { return }
    var target = {"target" : current }
    let tween = defaultTween(target, {target : newValue})
    .onUpdate(() => {
        document.querySelector(selector).innerHTML = Number(target.target).toFixed(1)
    })
    .onComplete(() => {
        if (showUnknown) {
            document.querySelector(selector).innerHTML = "?"
        }
    })
    .start()
}

function updateNode(node, destination) {
    let tween = defaultTween(node, destination)
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

function updateCylinderHeight(container, userDataKey, height) {
    let item = container.userData[userDataKey]
    if (item.userData != null && item.userData.isOutlinedNode) {
        let param =  item.children[1].geometry.parameters
        let geo = new THREE.CylinderGeometry(param.radiusTop, param.radiusBottom, height, param.radialSegments, param.heightSegments, param.openEnded, param.thetaStart, param.thetaLength)
        item.children[0].geometry = geo
        item.children[1].geometry = geo
    } else {
        let param =  item.geometry.parameters
        let geo = new THREE.CylinderGeometry(param.radiusTop, param.radiusBottom, height, param.radialSegments, param.heightSegments, param.openEnded, param.thetaStart, param.thetaLength)
        item.geometry = geo
    }
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
        activityNode.rotation.z = -Math.PI/2

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

        pulseTween(move.rotation, { x: Math.PI * 4, y: Math.PI * 2}, 12000)
        pulseTween(exercise.rotation, { y: Math.PI * 4, z: Math.PI * 2 }, 12000)
        pulseTween(stand.rotation, { z: Math.PI * 4, x: Math.PI * 2 }, 12000)
    }

    var activity = { move: ringArc(activityNode.userData.move), exercise: ringArc(activityNode.userData.exercise), stand: ringArc(activityNode.userData.stand) }
    var activityTarget = { move: moveArc, exercise: exerciseArc, stand: standArc }

    updateNode(activity, { move : moveArc })
    .onUpdate(() => {
        updateRing(0, activityNode.userData.move, activity.move)
    })

    updateNode(activity, { exercise : exerciseArc })
    .onUpdate(() => {
        updateRing(1, activityNode.userData.exercise, activity.exercise)
    })

    updateNode(activity, { stand : standArc })
    .onUpdate(() => {
        updateRing(2, activityNode.userData.stand, activity.stand)
    })

    updateLabel("#activityContainer #active_energy .data", data.active_energy.sum)
    updateLabel("#activityContainer #apple_exercise_time .data", data.apple_exercise_time.sum)
    updateLabel("#activityContainer #apple_stand_hour .data", data.apple_stand_hour.sum)
}

function updateHydration(data) {
    let hydrationNode = state.hydrationNode
    if (hydrationNode == null) {
        hydrationNode = new THREE.Group()
        hydrationNode.name = "hydration"
        hydrationNode.userData.matchSelector = "#hydrationContainer .graph"

        let goal = linesNode(new THREE.CylinderGeometry(50, 50, waterGoal, 4), colorVariable("bg2"))
        hydrationNode.add(goal)
        hydrationNode.userData.goal = goal
        let current = outlinedNode(new THREE.CylinderGeometry(40, 40, 0, 20), colorVariable("tint1"))
        hydrationNode.add(current)
        hydrationNode.userData.current = current

        state.hydrationNode = hydrationNode
        container.add(hydrationNode)

        pulseTween(current.rotation, { y: Math.PI }, 6000)
    }

    var hydration = { level : hydrationNode.userData.current.children[0].geometry.parameters.height }
    var target = { level : data.dietary_water.sum }

    updateNode(hydration, target)
    .onUpdate(() => {
        let geo = new THREE.CylinderGeometry(40, 40, hydration.level, 20)
        hydrationNode.userData.current.children[0].geometry = geo
        hydrationNode.userData.current.children[1].geometry = geo
    })

    updateLabel("#hydrationContainer .data", data.dietary_water.sum)
}

function updateMacronutrition(data) {
    let fatCaloriesPerGram = 9
    let carbCaloriesPerGram = 4
    let proteinCaloriesPerGram = 4
    let calorieGoal = 2352

    let calories = data.dietary_energy.sum

    var fat = data.total_fat.sum * fatCaloriesPerGram
    let saturatedFat = data.saturated_fat.sum * fatCaloriesPerGram
    fat -= saturatedFat

    var carb = data.carbohydrates.sum * carbCaloriesPerGram
    let sugar = data.dietary_sugar.sum * carbCaloriesPerGram
    let fiber = data.fiber.sum * carbCaloriesPerGram
    carb -= sugar
    carb -= fiber

    let protein = data.protein.sum * proteinCaloriesPerGram

    let other = calories - (fat + carb + protein)

    let macronutrientNode = state.macronutrientNode
    if (macronutrientNode == null) {
        macronutrientNode = new THREE.Group()
        macronutrientNode.name = "macronutrient"
        macronutrientNode.userData.matchSelector = "#macronutrientContainer .graph"

        let innerContainer = new THREE.Group()
        innerContainer.rotation.set(0, 0, Math.PI * 1.5)
        macronutrientNode.add(innerContainer)

        let goalRadius = 60
        let macroRadius = 160
        let littleRadius = 100
        let littlerRadius = 80

        let goal = linesNode(new THREE.CylinderGeometry(goalRadius, goalRadius, calorieGoal, 4), colorVariable("bg2"))
        innerContainer.add(goal)
        macronutrientNode.userData.goal = goal

        let fat = outlinedNode(new THREE.CylinderGeometry(macroRadius, macroRadius, 0, 20), colorVariable("tint1"))
        innerContainer.add(fat)
        macronutrientNode.userData.fat = fat

        let saturatedFat = outlinedNode(new THREE.CylinderGeometry(littleRadius, littleRadius, 0, 20), colorVariable("tint1"))
        innerContainer.add(saturatedFat)
        macronutrientNode.userData.saturatedFat = saturatedFat

        let carb = outlinedNode(new THREE.CylinderGeometry(macroRadius, macroRadius, 0, 20), colorVariable("tint2"))
        innerContainer.add(carb)
        macronutrientNode.userData.carb = carb

        let sugar = outlinedNode(new THREE.CylinderGeometry(littleRadius, littleRadius, 0, 20), colorVariable("tint2"))
        innerContainer.add(sugar)
        macronutrientNode.userData.sugar = sugar

        let fiber = outlinedNode(new THREE.CylinderGeometry(littlerRadius, littlerRadius, 0, 20), colorVariable("tint2"))
        innerContainer.add(fiber)
        macronutrientNode.userData.fiber = fiber

        let protein = outlinedNode(new THREE.CylinderGeometry(macroRadius, macroRadius, 0, 20), colorVariable("tint3"))
        innerContainer.add(protein)
        macronutrientNode.userData.protein = protein

        let other = outlinedNode(new THREE.CylinderGeometry(macroRadius, macroRadius, 0, 20), colorVariable("tint1"))
        innerContainer.add(other)
        macronutrientNode.userData.other = other
        other.visible = false
        
        let calories = outlinedNode(new THREE.CylinderGeometry(macroRadius, macroRadius, 0, 20), colorVariable("tint1"))
        innerContainer.add(calories)
        macronutrientNode.userData.calories = calories
        calories.visible = false

        pulseTween(fat.rotation, { y: Math.PI }, 12000)
        pulseTween(saturatedFat.rotation, { y: -Math.PI }, 10000)
        pulseTween(carb.rotation, { y: Math.PI }, 18000)
        pulseTween(sugar.rotation, { y: -Math.PI }, 16000)
        pulseTween(fiber.rotation, { y: -Math.PI }, 14000)
        pulseTween(protein.rotation, { y: Math.PI }, 10000)

        state.macronutrientNode = macronutrientNode
        container.add(macronutrientNode)
    }

    function getHeight(name) {
        return macronutrientNode.userData[name].children[0].geometry.parameters.height
    }

    function setHeight(name, height) {
        let param =  macronutrientNode.userData[name].children[0].geometry.parameters
        let geo = new THREE.CylinderGeometry(param.radiusTop, param.radiusBottom, height, param.radialSegments, param.heightSegments, param.openEnded, param.thetaStart, param.thetaLength)
        macronutrientNode.userData[name].children[0].geometry = geo
        macronutrientNode.userData[name].children[1].geometry = geo
    }

    var nutrition = {
        "fat" : getHeight("fat"),
        "saturatedFat" : getHeight("saturatedFat"),
        "carb" : getHeight("carb"),
        "sugar" : getHeight("sugar"),
        "fiber" : getHeight("fiber"),
        "protein" : getHeight("protein"),
        "other" : getHeight("other"),
        "calories" : getHeight("calories"),
    }
    var target = {
        "fat" : fat,
        "saturatedFat" : saturatedFat,
        "carb" : carb,
        "sugar" : sugar,
        "fiber" : fiber,
        "protein" : protein,
        "other" : other,
        "calories" : calories
    }

    updateNode(nutrition, target)
    .onUpdate(() => {
        setHeight("fat", nutrition.fat)
        setHeight("saturatedFat", nutrition.saturatedFat)
        setHeight("carb", nutrition.carb)
        setHeight("sugar", nutrition.sugar)
        setHeight("fiber", nutrition.fiber)
        setHeight("protein", nutrition.protein)
        setHeight("other", nutrition.other)
        setHeight("calories", nutrition.calories)

        macronutrientNode.userData.fat.position.y = -1 * (nutrition.calories - nutrition.fat)/2
        macronutrientNode.userData.saturatedFat.position.y = macronutrientNode.userData.fat.position.y + (nutrition.fat + nutrition.saturatedFat)/2
        macronutrientNode.userData.carb.position.y = macronutrientNode.userData.saturatedFat.position.y + (nutrition.saturatedFat + nutrition.carb)/2
        macronutrientNode.userData.sugar.position.y = macronutrientNode.userData.carb.position.y + (nutrition.carb + nutrition.sugar)/2
        macronutrientNode.userData.fiber.position.y = macronutrientNode.userData.sugar.position.y + (nutrition.sugar + nutrition.fiber)/2
        macronutrientNode.userData.protein.position.y = macronutrientNode.userData.fiber.position.y + (nutrition.fiber + nutrition.protein)/2
    })

    updateLabel("#dietary_energy .data", data.dietary_energy.sum)
    updateLabel("#total_fat .data", data.total_fat.sum)
    updateLabel("#saturated_fat .data", data.saturated_fat.sum)
    updateLabel("#carbohydrates .data", data.carbohydrates.sum)
    updateLabel("#dietary_sugar .data", data.dietary_sugar.sum)
    updateLabel("#fiber .data", data.fiber.sum)
    updateLabel("#protein .data", data.protein.sum)
}

function updateMicronutrition(data) {
    let dietary_cholesterol = data.dietary_cholesterol // ?
    let sodium = data.sodium // mineral

    updateLabel("#dietary_cholesterol .data", data.dietary_cholesterol.sum)
    updateLabel("#sodium .data", data.sodium.sum)
}

function updateRespiration(data) {
    updateLabel("#blood_oxygen_saturation .data", data.blood_oxygen_saturation.average)
    updateLabel("#respiratory_rate .data", data.respiratory_rate.average)
}

function updateSleep(data) {
    let sleepNode = state.sleepNode

    if (sleepNode == null) {
        let sleepGoal = 8
        sleepNode = new THREE.Group()
        sleepNode.name = "sleep_analysis"
        sleepNode.userData.matchSelector = "#sleep_analysis .graph"

        let goalRadius = 20
        let inBedRadius = 15
        let asleepRadius = 17

        let goal = linesNode(new THREE.CylinderGeometry(goalRadius, goalRadius, sleepGoal, 4), colorVariable("bg2"))
        sleepNode.userData.goal = goal
        sleepNode.add(goal)

        let inBed = outlinedNode(new THREE.CylinderGeometry(inBedRadius, inBedRadius, 0, 4), colorVariable("tint1"))
        inBed.userData.value = 0
        sleepNode.userData.inBed = inBed
        sleepNode.add(inBed)
        let asleep = outlinedNode(new THREE.CylinderGeometry(asleepRadius, asleepRadius, 0, 4), colorVariable("tint2"))
        asleep.userData.value = 0
        sleepNode.userData.asleep = asleep
        sleepNode.add(asleep)

        let overallScale = 2
        let verticalScale = 5 * overallScale
        goal.scale.set(overallScale, verticalScale, overallScale)
        inBed.scale.set(overallScale, verticalScale, overallScale)
        asleep.scale.set(overallScale, verticalScale, overallScale)

        state.sleepNode = sleepNode
        container.add(sleepNode)

        pulseTween(inBed.rotation, { y: Math.PI }, 6000)
        pulseTween(asleep.rotation, { y: -Math.PI }, 4000)
    }

    var sleep = {
        "inBed" : sleepNode.userData.inBed.userData.value,
        "asleep" : sleepNode.userData.asleep.userData.value,
    }
    var target = {
        "inBed" : data.sleep_analysis.inBed,
        "asleep" : data.sleep_analysis.asleep,
    }

    updateNode(sleep, target)
    .onUpdate(() => {
        sleepNode.userData["inBed"].userData.value = sleep.inBed
        sleepNode.userData["asleep"].userData.value = sleep.asleep
        updateCylinderHeight(sleepNode, "inBed", sleep.inBed)
        updateCylinderHeight(sleepNode, "asleep", sleep.asleep)
    })

    updateLabel("#sleep_analysis_in_bed .data", data.sleep_analysis.inBed)
    updateLabel("#sleep_analysis_asleep .data", data.sleep_analysis.asleep)
}

function updateMobility(data) {
    // console.log(data)
    // flights_climbed
    // stair_speed_up
    // stair_speed_down
    // step_count
    // walking_asymmetric_percentage
    // walking_double_support_percentage
    // walking_heart_rate_average
    // walking_running_distance
    // walking_speed
    // walking_step_length
}

function updateTooltips(data) {
    var dataTypes = Object.keys(data)
    dataTypes.push("sleep_analysis_in_bed")
    dataTypes.push("sleep_analysis_asleep")
    let sleepIndex = dataTypes.indexOf("sleep_analysis")
    if (sleepIndex != -1) {
        dataTypes.splice(sleepIndex, 1)
    }
    for (var dataType of dataTypes) {
        let selector = "#" + dataType
        let dataNode = document.querySelector(selector)
        if (dataNode != null) {
            var unit = dataNode.dataset.unit
            if (unit == null) {
                unit = data[dataType].unit
            }
            let dataTypeCopy = dataType
            dataNode.dataset.unit = unit
            dataNode.onpointerenter = function(e) {
                showTooltip(e, dataTypeCopy)
            }
            dataNode.onpointermove = function(e) {
                showTooltip(e, dataTypeCopy)
            }
            dataNode.onpointerleave = function(e) {
                showTooltip(e, null)
            }
        }
    }
}

function applyDayData(data) {
    updateHeartRate(data)
    updateActivity(data)
    updateHydration(data)
    updateMacronutrition(data)
    updateMicronutrition(data)
    updateRespiration(data)
    updateSleep(data)
    updateMobility(data)

    updateTooltips(data)
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

    for (var sleep of metricsByType["sleep_analysis"].data) {
        let wakeDate = dateFromHealthExportDateString(sleep.inBedEnd)
        let wakeDay = dateStrippingTimeComponents(wakeDate)
        var dayData = metricsByDay[wakeDay]
        if (dayData != null) {
            dayData.sleep_analysis = sleep
            metricsByDay[wakeDay] = dayData
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
    updateBirthOffset()
    showTooltip(null, null)
}

window.onload = function() {
    setup()
    reload()
    animate()
}

window.onresize = layout

