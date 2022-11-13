import * as MetricNode from './metric_node.js'

class Activity extends MetricNode.MetricNode {
    name = "Activity"
    matchesTypes(metricTypes) {
        return metricTypes.includes('active_energy') &&
               metricTypes.includes('apple_exercise_time') &&
               metricTypes.includes('apple_stand_hour')
    }

    update(data) {
        let moveArc = (data.active_energy.sum / moveGoal) * Math.PI * 2
        let exerciseArc = (data.apple_exercise_time.sum / exerciseGoal) * Math.PI * 2
        let standArc = (data.apple_stand_hour.sum / standGoal) * Math.PI * 2

        this.updateRing(0, self.moveNode, moveArc)
        this.updateRing(1, self.exerciseNode, exerciseArc)
        this.updateRing(2, self.standNode, standArc)
    }

    updateRing(level, ring, arc) {
        let clampedArc = Math.max(0, Math.min(arc, Math.PI * 2))
        let geo = new THREE.TorusGeometry(100 - (level * 30), 10, 8, 16 * (arc / Math.PI*2), clampedArc)
        ring.children[0].geometry = geo
        ring.children[1].geometry = geo
    }

    activityRing(arc, level, color) {
        let clampedArc = Math.max(0, Math.min(arc, Math.PI * 2))
        let geo = new THREE.TorusGeometry(100 - (level * 30), 10, 8, 16 * (arc / Math.PI*2), clampedArc)
        let node = outlinedNode(geo, color)
        node.rotation.z = -Math.PI/2

        return node
    }

    constructor() {
        self = super()
        self.moveNode = this.activityRing(1, 0, colorVariable("tint1"))
        self.exerciseNode = this.activityRing(1, 1, colorVariable("tint2"))
        self.standNode = this.activityRing(1, 2, colorVariable("tint3"))
        self.node.add(self.moveNode)
        self.node.add(self.exerciseNode)
        self.node.add(self.standNode)
        let bounds = new THREE.Box3()
        bounds.expandByObject(self.node)
        let size = new THREE.Vector3()
        console.log(bounds.getSize(size))
    }
}

export { Activity }

