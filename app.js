var express = require('express');
var request = require('request');
var mime = require('mime');
var gm = require('gm');
var url = require('url');
var fs = require('fs');
var expressWinston = require('express-winston');
var errors = require('./lib/errors');
var config = require('./lib/config');
var Timers = require('./lib/timers');
var authorize = require('./lib/authorize');
var log = require('./lib/log');

module.exports = function (worker) {

	var port = config.port || 3000;
	var app = express();
	var downloader = require('./lib/downloader');
	var processor = require('./lib/processor');

	app.disable('x-powered-by');

	app.set('port', port);

	// Logging middleware.
	if (!config.log || !config.log.disableAccessLogging) {
		app.use(expressWinston.logger({ winstonInstance: log, msg: 'HTTP {{req.method}} {{req.url}}' }));
	}

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

	app.use('/static', express.static('static'));

	app.get(/^\/([a-zA-Z0-9_]+)(:[a-z0-9]+)?\/(.+)\/(?!https?\:?)$/, function (req, res, next) {
		req.clientAndOperations = req.path;
		handleImageRequest(req, res, next);
	});

	app.get(/^\/([a-zA-Z0-9_]+)(:[a-z0-9]+)?\/(.+)\/(https?:\/\/?.+)$/, function (req, res, next) {
		handleImageRequestTrailingUrl(req, res, next);
	});

	app.get(/^\/([a-zA-Z0-9_]+)(%3A[a-z0-9]+)?\/(.+)\/(https?%3A\/\/?.+)$/, function (req, res, next) {
		req.url = req.url.replace(/%3A/g, ':');
		handleImageRequestTrailingUrl(req, res, next);
	});

	function handleImageRequestTrailingUrl(req, res, next) {
		var imageUrlPos = req.path.substr(0).search(/https?:\//);
		if (imageUrlPos > 0) {
			req.query.url = req.path.substr(imageUrlPos);
			req.clientAndOperations = req.path.substr(0, imageUrlPos);
		}
		handleImageRequest(req, res, next);
	}

		// Image processing route.
	function handleImageRequest(req, res, next) {

		if (!req.query.url) {
			return next(new errors.MissingImageUrl("No image URL given"));
		}
		if (!req.clientAndOperations) {
			return next(new errors.MissingOperations("Missing client and/or operations"));
		}

		var clientAndOperations = req.clientAndOperations.replace(/\/$/, '');
		var firstSlashPos = req.clientAndOperations.indexOf('/', 1);
		req.params.operations = clientAndOperations.substring(firstSlashPos + 1);
		req.params.client = req.params[0];
		req.params.signature = (req.params[1] || '').replace(/^:/, '');
		req.params.imageUrl = req.query.url.replace(/(https?):\/\/?([^\/])/i, '$1://$2');


		// Authorize the current request.
		authorize(req, res, function (e) {

			if (e) {
				return next(e);
			}

			var clientConfig = (config.client && config.client[req.params.client]) || {};
			var timers = new Timers();
			var downloadOptions = {
				timeout: 1000 * (config.requestTimeout || 5),
				headers: {
					'User-Agent': (config.downloader && config.downloader.userAgent) || 'pointr'
				}
			};

			timers.start('download');
			downloader(req.params.imageUrl, downloadOptions).then(handleDownloadComplete).catch(handleDownloadError);

			function handleDownloadError(e) {
				next(e);
			}

			function handleDownloadComplete(result) {

				var path = result.path;
				var response = result.response;
				var cleanup = result.cleanup;
				var responseHeaders = response.headers;
				var responseHeadersToCopy = [
					'last-modified'
				];

				timers.stop('download');
				timers.start('process');

				req.workComplete = function () {
					cleanup();
				};

				var imageGm = gm(path);
				processor(req.params.operations, imageGm, path).then(handleImageComplete).catch(handleImageError);

				function handleImageError(e) {
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

						var cacheMatches = (responseHeaders['cache-control'] || '').match(/max-age=([0-9]+)/i) || {};
						var cacheResponse = +(cacheMatches[1] || 0);
						var cacheClient = clientConfig.cache || {};
						var cacheGlobal = config.cache || {};
						var cacheDefault = cacheClient.ttlDefault || cacheGlobal.ttlDefault || 2592000;
						var cacheMin = cacheClient.ttlMin || cacheGlobal.ttlMin || 3600;
						var cacheMax = cacheClient.ttlMax || cacheGlobal.ttlMax || 2592000;
						var cacheFinal = Math.max(cacheMin, Math.min(cacheMax, cacheResponse || cacheDefault));

						res.set('Cache-Control', 'max-age=' + cacheFinal);

						// Set the content type to the mime type specified by a format operation
						// or the response header content-type or based on the image URL file extension.
						var contentType =
							context.mime ||
							responseHeaders['content-type'] ||
							mime.lookup(req.params.imageUrl);
						if (contentType && contentType !== 'application/octet-stream') {
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

						context.image.stream()
							.on('end', req.workComplete)
							.on('close', req.workComplete)
							.on('error', req.workComplete)
							.pipe(res);

					} else {
						next(new errors.NoImageReturned('No image returned'));
					}
				}
			}
		});
	}

	// Error handler.
	app.use(function(err, req, res, next) {
		if (!err.publicMessage) {
			log.error(err.message || 'Unknown error', { exception: err, stack: err.stack || null });
		}
		req.workComplete && req.workComplete();
		res.status(err.statusCode || 500).json({
			error: true,
			errorType: err.type || null,
			errorMessage: err.publicMessage || 'Internal Server Error'
		});
	});

	return app.listen(port);
};
