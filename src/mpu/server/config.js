module.exports = () => {
    if (process.argv.length > 2) {
        const config = require(process.argv[2])
        config.ENABLE_CHAR = '+',
        config.DISABLE_CHAR = '-'
        return config
    } else {
        console.error('Configuration file not provided, exiting.')
        process.exit(1)
    }
}
