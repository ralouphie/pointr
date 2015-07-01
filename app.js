var express = require('express');
var request = require('request');
var mime = require('mime');
var gm = require('gm');
var url = require('url');
var fs = require('fs');
var morgan = require('morgan');
var errors = require('./lib/errors');
var config = require('./lib/config');
var Timers = require('./lib/timers');
var authorize = require('./lib/authorize');
var log = require('./lib/log');

module.exports = function (worker) {

	var port = config.port || 3000;
	var app = express();
	var processor = require('./lib/processor');
	var workQueue = require('./lib/work-queue')(1);
	var cacheSeconds = config.cacheSeconds || 2592000; // Default cache time to 30 days.

	app.disable('x-powered-by');

	app.set('port', port);

	// Logging middleware.
	app.use(morgan('combined', { stream: log.stream }));

	// CORS middleware.
	app.use(function(req, res, next) {
		res.set('Access-Control-Allow-Origin', '*');
		res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
		next();
	});

	// Server heartbeat route.
	app.get('/', function (req, res) {
		res.status(200).end();
	});

	// Image processing route.
	app.get(/^\/([a-zA-Z0-9_]+)(:[a-z0-9]+)?\/(.+)\/(https?:\/\/.+)$/, function handleImageRequest(req, res, next) {
		workQueue.post(function (work) {

			req.workComplete = function () {
				req.workComplete = function () { };
				work.complete();
			};
			req.params.client = req.params[0];
			req.params.signature = (req.params[1] || '').replace(/^:/, '');
			req.params.operations = req.params[2];

			// Use request URL to preserve query parameters stripped by Express.
			var imageUrl = req.url.match(/https?:\/\/[^$]+/);
			if (imageUrl) {
				imageUrl = imageUrl[0];
			}
			req.params.imageUrl = imageUrl;

			// Authorize the current request.
			authorize(req, res, function (e) {

				if (e) {
					return next(e);
				}

				var timers = new Timers();
				timers.start('download');

				var imageReq = request.get(req.params.imageUrl);
				var imageGm = gm(imageReq);

				var responseHeaders;
				var responseHeadersToCopy = [
					'last-modified'
				];

				imageReq.on('response', function(response) {
					responseHeaders = response.headers;
				});

				imageReq.on('end', function () {
					timers.stop('download');
					timers.start('process');
				});

				function handleImageError(e) {
					req.workComplete();
					next(e);
				}

				function handleImageComplete(context) {

					timers.stop('process');

					// If the client requested just the data, return it as JSON.
					// Otherwise stream the image back to the client.
					if ('undefined' !== typeof req.query.data) {
						res.json({
							timers: timers,
							operations: context.operationsRawData || null
						});
					} else if (context.image) {

						// Set the cache time for the response.
						res.set('Cache-Control', 'Max-Age=' + cacheSeconds);

						// Set the content type to the mime type specified by a format operation
						// or the response header content-type or based on the image URL file extension.
						var contentType =
							context.mime ||
							responseHeaders['content-type'] ||
							mime(req.params.imageUrl);
						if (contentType) {
							res.set('content-type', contentType);
						}

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
						next(new errors.NoImageReturned('No image returned'));
					}

					req.workComplete();
				}

				imageReq.on('error', handleImageError);
				processor(req.params.operations, imageGm).then(handleImageComplete).catch(handleImageError);

			});
		});
	});

	// Error handler.
	app.use(function(err, req, res, next) {
		if (!err.publicMessage) {
			log.error(err.message || 'Unknown error', err);
		}
		req.workComplete && req.workComplete();
		res.status(err.statusCode || 500).json({
			error: true,
			errorType: err.type || null,
			errorMessage: err.publicMessage || 'Internal Server Error'
		});
	});

	app.listen(port, function () {
		log.info('[pointr-worker] ' + worker.id + ', port', app.get('port'));
	});
};
