let moveGoal = 440
let exerciseGoal = 30
let standGoal = 12

function colorVariable(name) {
    return new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--" + name))
}

function linesNode(geo, color) {
    let linesMaterial = new THREE.LineBasicMaterial({color: color})
    linesMaterial.linewidth = 4
    let lines = new THREE.LineSegments(geo, linesMaterial)
    return lines
}

function outlinedNode(geo, color) {
    let out = new THREE.Group()
    let regularMaterial = new THREE.MeshPhysicalMaterial({color: color, side: THREE.DoubleSide})
    regularMaterial.transparent = true
    regularMaterial.opacity = 0.8
    let regular = new THREE.Mesh(geo, regularMaterial)
    out.add(linesNode(geo, color))
    out.add(regular)
    return out
}

