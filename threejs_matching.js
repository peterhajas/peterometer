function matchLayout(container) {
    container.traverse(function(item) {
        if (item.userData == null) { return }
        if (item.userData.matchName == null) { return }
        let matchName = item.userData.matchName
        let element = document.getElementsByClassName(matchName)[0]
        if (element == null) { return }
        let rect = element.getBoundingClientRect()
        item.position.set(rect.x, rect.y, 0)
    })
}

export { matchLayout }
