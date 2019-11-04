module.exports = () => {
    if (process.argv.length > 2) {
        const config = require(process.argv[2])
        return config
    } else {
        console.error('Configuration file not provided, exiting.')
        process.exit(1)
    }
}
