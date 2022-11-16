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

function updateForDay(data, metricsBrowser, onSelection) {
    let metricTypes = Object.keys(data)
    for (var metricHandler of metricHandlers) {
        if (metricHandler.matchesTypes(metricTypes)) {
            let element = document.createElement("li")
            element.innerHTML = metricHandler.name
            let matchingNode = document.createElement("span")
            matchingNode.className = "browser " + metricHandler.name
            element.appendChild(matchingNode)
            metricsBrowser.appendChild(element)
            metricHandler.update(data)
            element.onclick = function(e) {
                onSelection(metricHandler)
            }
        }
    }
}

export { install, updateForDay }

