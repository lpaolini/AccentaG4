const log = require('./log')

const config = () => {
    if (process.argv.length > 2) {
        const config = require(process.argv[2])
        return config
    } else {
        log.error('Configuration file not provided, exiting.')
        process.exit(1)
    }
}

module.exports = config()
