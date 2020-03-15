const timestamp = () => new Date().toISOString()

const log = {
    debug: (...args) => console.log(timestamp(), ...args),
    info: (...args) => console.info(timestamp(), ...args),
    error: (...args) => console.error(timestamp(), ...args)
}

module.exports = log
