var spawn = require('child_process').spawn

module.exports = Notify

function Notify(config) {
    if (config) {
        console.log('email notifications sent to: ' + config.to)
        return function (message) {
            var mail = spawn('msmtp', ['--from=dummy', '--read-recipients'], {stdio: ['pipe', process.stdout, process.stderr]})
            mail.stdin.write('To: ' + config.to + '\n')
            mail.stdin.write('Subject: ' + message + '\n')
            mail.stdin.write('\n')
            mail.stdin.write(message + '\n')
            mail.stdin.end()
            console.log('notification: ' + message)
        }
    } else {
        return function (message) {
            console.log('notification: ' + message)
        }
    }
}
