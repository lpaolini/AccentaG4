var spawn = require('child_process').spawn;

module.exports = Notify;

function Notify(config) {
	if (config) {
		console.log('email notifications from: ' + config.from + ' to: ' + config.to);
		return function (message) {
			var ssmtp = spawn('ssmtp', [config.to], {stdio: ['pipe', process.stdout, process.stderr]});
			ssmtp.stdin.write('From: ' + config.from + '\n');
			ssmtp.stdin.write('To: ' + config.to + '\n');
			ssmtp.stdin.write('Subject: ' + message + '\n');
			ssmtp.stdin.write('\n');
			ssmtp.stdin.write(message + '\n');
			ssmtp.stdin.end();
			console.log('notification: ' + message);
		}
	} else {
		return function (message) {
			console.log('notification: ' + message);
		}
	}
}
