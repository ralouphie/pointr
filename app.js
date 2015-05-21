var express = require('express');
var request = require('request');
var gm = require('gm');

module.exports = function (worker) {

	var port = process.env.POINTR_PORT || 3000;
	var allowUnsafe = !!process.env.POINTR_ALLOW_UNSAFE;
	var keys = (process.env.POINTR_SHARED_KEYS || '').split(/\s+/).filter(function (item) {
		return !!item;
	});

	var app = express();
	var processor = require('./lib/processor');
	var workQueue = require('./lib/work-queue')(1);
	var verifySignature = require('./lib/verify-signature');

	app.disable('x-powered-by');

	app.set('port', port);

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

			if (signature === 'unsafe') {
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
					timers.process.millis = new Date() - timers.process.start;
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
		console.log('pointr worker ' + worker.id + ' is running on port', app.get('port'));
	});
};