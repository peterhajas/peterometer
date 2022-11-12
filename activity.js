class Activity {
    name() { return "Activity" }
    inTypes(metricTypes) {
        return metricTypes.includes('active_energy') &&
               metricTypes.includes('apple_exercise_time') &&
               metricTypes.includes('apple_stand_hour')
    }
}

export { Activity }

