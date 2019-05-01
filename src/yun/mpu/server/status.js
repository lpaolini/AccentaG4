module.exports = Status

function Status(handlers) {
    this.handlers = handlers
    this.status = {}
}

Status.prototype.update = function (property, status) {
    if ((this.status[property]) !== status) {
        this.status[property] = status
        var handler = this.handlers[property]
        handler && handler(status)
    }
}

Status.prototype.read = function (property) {
    return this.status[property]
}
