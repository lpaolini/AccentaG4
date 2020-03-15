const timestamp = () => new Date().toISOString()

const logger = {
    debug: console.log,
    info: console.info,
    error: console.error
}

const log = (level, args) =>
    logger[level](`${timestamp()} [${level.toUpperCase()}]`, ...args)

module.exports = {
    debug: (...args) => log('debug', args),
    info: (...args) => log('info', args),
    error: (...args) => log('error', args)
}
