import * as Activity from './activity.js'

var metricHandlers = [
    new Activity.Activity()
]

function install(container) {
    for (var metricHandler of metricHandlers) {
        metricHandler.node.userData.matchName = metricHandler.name
        container.add(metricHandler.node)
    }
}

function updateForDay(data, metricsBrowser) {
    let metricTypes = Object.keys(data)
    for (var metricHandler of metricHandlers) {
        if (metricHandler.matchesTypes(metricTypes)) {
            let element = document.createElement("li")
            element.innerHTML = metricHandler.name
            let matchingNode = document.createElement("span")
            matchingNode.className = "browser " + metricHandler.name
            element.appendChild(matchingNode)
            metricsBrowser.appendChild(element)
            metricHandler.node.position.set(100, 100, 100)
            metricHandler.update(data)
        }
    }
}

export { install, updateForDay }

