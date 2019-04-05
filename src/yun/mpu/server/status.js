module.exports = Status

function Status(handlers) {
    this.handlers = handlers
    this.status = {}
}

Status.prototype.update = function (property, status) {
    if ((!this.status[property]) == status) {
        this.handlers[property](this.status[property] = status)
    }
}
