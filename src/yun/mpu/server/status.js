module.exports = Status;

function Status(handlers) {
  this.handlers = handlers;
  this.status = {};
}

Status.prototype.update = function (property, trigger) {
  if (trigger) {
    if (!this.status[property]) {
      this.handlers[property](this.status[property] = true);
    }
  } else {
    if (this.status[property]) {
      this.handlers[property](this.status[property] = false);
    }
  }
};
