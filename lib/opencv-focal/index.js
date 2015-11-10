var path = require('path');
var childProcess = require('child_process');
var focal = require('./focal');
var binary = path.resolve(__dirname, './run');

function openCvFocal(options, callback) {

	var timeoutId;
	var timeout = options.timeout;
	delete options.timeout;
	timeout = Math.max(0, 'undefined' === typeof timeout ? 5000 : +timeout);

	var args = [JSON.stringify(options)];
	var child = childProcess.spawn(binary, args);
	var partsOut = [];
	var partsErr = [];
	var waiting = true;

	function cb(e, result) {
		if (waiting) {
			timeoutId && clearTimeout(timeoutId);
			callback(e, result);
			waiting = false;
		}
	}

	if (timeout) {
		timeoutId = setTimeout(function() {
			cb(new Error('openCvFocal() resulted in a timeout'));
			if (child && child.connected) {
				child.stdin.pause();
				child.kill();
			}
		}, timeout);
	}

	child.stdout.on('data', function (data) {
		partsOut.push(data);
	});

	child.stderr.on('data', function (data) {
		partsErr.push(data);
	});

	child.on('error', cb);

	child.on('close', function (code) {
		var out = Buffer.concat(partsOut).toString('utf8');
		var err = Buffer.concat(partsErr).toString('utf8');
		if (code !== 0 || err) {
			var error;
			try {
				var e = JSON.parse(err);
				error = new Error('Focal point detection failed: ' + e.message || null, e);
			} catch (e) {
				error = new Error('Focal point detection failed: ' + err);
			}
			cb(error);
		} else {
			var result;
			try {
				result = JSON.parse(out);
			} catch (e) {
				result = null;
			}
			cb(null, result);
		}
	});
}

openCvFocal.detections = focal.detections;
module.exports = openCvFocal;
