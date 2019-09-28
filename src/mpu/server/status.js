module.exports = Status

function Status(handlers) {
    this.handlers = handlers
    this.status = {}
}

Status.prototype.update = function (property, status) {
    const prevStatus = this.status[property] || false
    if (status !== prevStatus) {
        this.status[property] = status
        var handler = this.handlers[property]
        handler && handler(status)
    }
}

Status.prototype.read = function (property) {
    return this.status[property]
}
