import * as Activity from './activity.js'

function populateMetricsBrowser(data, browser) {
    let metricTypes = Object.keys(data)
    let activity = new Activity.Activity()
    if (activity.inTypes(metricTypes)) {
        let element = document.createElement("li")
        element.innerHTML = activity.name()
        browser.appendChild(element)
    }
}

export { populateMetricsBrowser }

