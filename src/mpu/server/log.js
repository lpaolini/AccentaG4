const timestamp = () => new Date().toISOString()

const foo = (method, level, args) =>
    console[method](`${timestamp()} [${level}]`, ...args)

const log = {
    debug: (...args) => foo('log', 'DEBUG', args),
    info: (...args) => foo('info', 'INFO', args),
    error: (...args) => foo('error', 'ERROR', args)
}

module.exports = log
