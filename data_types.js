import * as Activity from './activity.js'

var metricHandlers = [
    new Activity.Activity()
]

function updateForDay(data, metricsBrowser, container) {
    let metricTypes = Object.keys(data)
    for (var metricHandler of metricHandlers) {
        if (metricHandler.matchesTypes(metricTypes)) {
            let element = document.createElement("li")
            element.innerHTML = metricHandler.name
            metricsBrowser.appendChild(element)
            container.add(metricHandler.node)
            metricHandler.node.position.set(100, 100, 100)
            metricHandler.update(data)
        }
    }
}

export { updateForDay }

