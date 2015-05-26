var express = require('express');
var request = require('request');
var gm = require('gm');
var url = require('url');
var fs = require('fs');

function regexQuote(str) {
	return (str + '').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
}

function getHostList(file) {
	var hosts = [];
	if (file && fs.existsSync(file)) {
		var text = fs.readFileSync(file, { encoding: 'utf8' });
		text.split(/\n+/).forEach(function (host) {
			host = host.toLowerCase().trim();
			if (!host.match(/^\#+/i)) {
				hosts.push(host);
			}
		});
	}
	return hosts;
}

function buildHostRegex(hosts) {
	if (hosts && hosts.length) {
		var regexParts = hosts.map(function (host) {
			var wildcard = !!host.match(/^\*+\.*/);
			host = host.replace(/\*+/, '').replace(/^\.+/, '');
			return (wildcard ? '.*' : '') + regexQuote(host);
		});
		return '(' + regexParts.join(')|(') + ')';
	}
	return null;
}

module.exports = function (worker) {

	var port = process.env.POINTR_PORT || 3000;
	var allowUnsafe = !!process.env.POINTR_ALLOW_UNSAFE;
	var hostWhiteListFile = process.env.POINTR_DOMAIN_WHITELIST_FILE;
	var keys = (process.env.POINTR_SHARED_KEYS || '').split(/\s+/).filter(function (item) {
		return !!item;
	});

	var hostWhiteListRegex = null;
	if (hostWhiteListFile) {
		var hostWhiteListItems = getHostList(hostWhiteListFile);
		if (worker.id === 1) {
			if (hostWhiteListItems && hostWhiteListItems.length) {
				hostWhiteListItems.forEach(function (pattern) {
					console.log('[whitelist] ' + pattern);
				});
			} else {
				console.log('[empty-or-invalid-whitelist]');
			}
		}
		var hostWhiteListExpr = buildHostRegex(hostWhiteListItems);
		hostWhiteListRegex = hostWhiteListExpr && new RegExp('^' + hostWhiteListExpr + '$', 'i');
	}

	var app = express();
	var processor = require('./lib/processor');
	var workQueue = require('./lib/work-queue')(1);
	var verifySignature = require('./lib/verify-signature');

	app.disable('x-powered-by');

	app.set('port', port);

	app.use(function(req, res, next) {
		res.set('Access-Control-Allow-Origin', '*');
		res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
		next();
	});

	app.get('/', function (req, res) {
		res.status(200).end();
	});

	app.get(/^\/([a-z0-9]+)\/(.+)\/(https?:\/\/.+)$/, function handleImageRequest(req, res) {
		workQueue.post(function (work) {

			var timers = {
				download: { start: new Date(), millis: null },
				process: { start: null, millis: null }
			};

			var signature = req.params[0];
			var operations = req.params[1];
			var imageUrl = req.params[2];
			var imageReq = request.get(imageUrl);
			var imageGm = gm(imageReq);

			var responseHeaders;
			var responseHeadersToCopy = [
				'content-type',
				'last-modified',
				'cache-control'
			];

			imageReq.on('response', function(response) {
				responseHeaders = response.headers;
			});

			imageReq.on('end', function () {
				var now = new Date();
				timers.download.millis = now - timers.download.start;
				timers.process.start = now;
			});


			// Check if the domain is white-listed.
			var whiteListed = false;
			if (hostWhiteListRegex) {
				var imageUrlParts = url.parse(imageUrl);
				if (imageUrlParts && imageUrlParts.hostname && imageUrlParts.hostname.match(hostWhiteListRegex)) {
					whiteListed = true;
				}
			}

			// If the domain is not white-listed, see if the signature is valid.
			if (!whiteListed) {
				if (signature === 'white') {
					return handleImageError(new Error('Cannot request non-whitelisted URL'));
				} else if (signature === 'unsafe') {
					if (!allowUnsafe) {
						return handleImageError(new Error('Cannot request unsafe URL'));
					}
				} else {
					if (!keys.length) {
						return handleImageError(new Error('No keys provided in configuration'));
					}
					if (!verifySignature(signature, operations + '/' + imageUrl, keys)) {
						return handleImageError(new Error('Invalid signature'));
					}
				}
			}

			function sendError(e) {
				res.status(e.statusCode || 500).json({
					error: true,
					errorType: e.type || null,
					errorMessage: e.message || null
				});
			}

			function handleImageError(e) {
				sendError(e);
				work.complete();
			}

			function handleImageComplete(context) {

				if (timers.process.start) {
					timers.process.millis = new Date() - timers.process.start;
				}

				// If the client requested just the data, return it as JSON.
				// Otherwise stream the image back to the client.
				if (req.query.data) {
					res.json({
						timers: timers,
						operations: context.operationsRawData || null
					});
				} else if (context.image) {

					// Copy the response headers.
					if (responseHeaders) {
						responseHeadersToCopy.forEach(function (header) {
							if (responseHeaders[header]) {
								res.set(header, responseHeaders[header]);
							}
						});
					}

					// Send the timers back as headers.
					Object.keys(timers).forEach(function (timerKey) {
						var millis = timers[timerKey].millis;
						res.set('x-pointr-timer-' + timerKey, (millis === null ? '?' : millis));
					});

					context.image.stream().pipe(res);

				} else {
					sendError(new Error('No image returned'));
				}

				work.complete();
			}

			imageReq.on('error', handleImageError);
			processor(operations, imageGm).then(handleImageComplete).catch(handleImageError);
		});
	});

	app.listen(port, function () {
		console.log('[pointr-worker] ' + worker.id + ', port', app.get('port'));
	});
};