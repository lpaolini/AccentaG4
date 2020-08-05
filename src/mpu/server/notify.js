const spawn = require('child_process').spawn
const log = require('./log')

const Notify = config => {
    if (config) {
        log.debug('email notifications sent to: ' + config.to)
        return function (message) {
            // var mail = spawn('msmtp', ['--from=dummy', '--read-recipients'], {stdio: ['pipe', process.stdout, process.stderr]})
            var mail = spawn('sendmail', [config.to], {stdio: ['pipe', process.stdout, process.stderr]})
            mail.stdin.write('From: \n')
            mail.stdin.write('To: ' + config.to + '\n')
            mail.stdin.write('Subject: ' + message + '\n')
            mail.stdin.write('\n')
            mail.stdin.write(message + '\n')
            mail.stdin.end()
            log.info(message)
        }
    } else {
        return function (message) {
            log.info(message)
        }
    }
}

module.exports = Notify
