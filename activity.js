import * as MetricNode from './metric_node.js'

class ActivityNode extends MetricNode.MetricNode {

}

class Activity {
    constructor() {
        console.log("INIT")
        self.node = new ActivityNode()
    }
    name() {
        return "Activity"
    }
    inTypes(metricTypes) {
        return metricTypes.includes('active_energy') &&
               metricTypes.includes('apple_exercise_time') &&
               metricTypes.includes('apple_stand_hour')
    }
    metricNode() {
        return self.node
    }
}

export { Activity }

