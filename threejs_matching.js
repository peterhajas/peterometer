function matchLayout(container) {
    container.traverse(function(item) {
        if (item.userData == null) { return }
        if (item.userData.matchName == null) { return }

        var currentMatched = null
        if (item.userData.currentMatched != null) {
            currentMatched = item.userData.currentMatched
        }

        let matchName = item.userData.matchName
        let elements = document.getElementsByClassName(matchName)
        if (elements.length == 0) { return }
        var element = elements.namedItem("focusIndicator")
        if (element == null) { element = elements[0] }

        var nearestFullParent = element
        while(nearestFullParent.getBoundingClientRect().width == 0) {
            nearestFullParent = nearestFullParent.parentNode
        }

        if (nearestFullParent != currentMatched) {
            let rect = nearestFullParent.getBoundingClientRect()
            
            let scaleX = (rect.width / 200)
            let scaleY = (rect.height / 200)
            let scale = Math.min(scaleX, scaleY)

            let centerX = rect.left + rect.width / 2
            let centerY = rect.top + rect.height / 2
            item.position.set(centerX, centerY, 0)
            item.scale.set(scale, scale, 1)
            item.userData.currentMatched = nearestFullParent
        }
    })
}

export { matchLayout }
