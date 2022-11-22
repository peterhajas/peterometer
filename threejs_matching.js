function applyUnitXY(node, unitX, unitY) {
    var cursor = node
    while (cursor != null) {
        if (cursor.userData == null ||
            cursor.userData.matchSelector == null) {
            cursor = cursor.parent
        }
        else {
            break
        }
    }
    if (cursor == null) { return }

    let matchSelector = cursor.userData.matchSelector
    let element = document.querySelector(matchSelector)
    if (element == null) {
        console.log("no match for " + matchSelector)
        return
    }
    let rect = element.getBoundingClientRect()
    if (unitX != null) {
        node.position.x = (unitX * rect.width) - (rect.width / 2)
    }
    if (unitY != null) {
        node.position.y = (unitY * rect.height) - (rect.height / 2)
    }
}

function matchLayout(container) {
    container.traverse(function(item) {
        if (item.userData == null) { return }

        if (item.userData.matchSelector != null) {
            let matchSelector = item.userData.matchSelector
            let element = document.querySelector(matchSelector)

            let rect = element.getBoundingClientRect()
            let centerX = rect.left + window.scrollX + rect.width / 2
            let centerY = rect.top + window.scrollY + rect.height / 2
            item.scale.set(1, 1, 1)
            item.position.set(centerX, centerY, 0)

            let boundingBox = new THREE.Box3()
            boundingBox.expandByObject(item)
            var boundingSize = new THREE.Vector3()
            boundingBox.getSize(boundingSize)
            var scaleX = rect.width / boundingSize.x
            var scaleY = rect.width / boundingSize.y

            if (scaleX < 1.0 || scaleY < 1.0) {
                let scale = Math.min(scaleX, scaleY)
                item.scale.set(scale, scale, scale)
            }
        }

        if (item.userData.unitX != null) {
            applyUnitXY(item, item.userData.unitX, null)
        }
        if (item.userData.unitY != null) {
            applyUnitXY(item, null, item.userData.unitY)
        }
    })
}

export { matchLayout }
