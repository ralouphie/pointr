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

	app.set('port', port);

	app.get('/', function (req, res) {
		res.status(200).end();
	});

	app.get(/^\/([a-z0-9]+)\/(.+)\/(https?:\/\/.+)$/, function handleImageRequest(req, res) {
		workQueue.post(function (work) {

			var signature = req.params[0];
			var operations = req.params[1];
			var imageUrl = req.params[2];
			var imageReq = request.get(imageUrl);
			var imageGm = gm(imageReq);

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
				work.complete();
				sendError(e);
			}

			function handleImageComplete(context) {
				work.complete();
				if (req.query.data) {
					res.json(context.operationsRawData || null);
				} else if (context.image) {
					context.image.stream().pipe(res);
				} else {
					sendError(new Error('No image returned'));
				}
			}

			imageReq.on('error', handleImageError);
			processor(operations, imageGm).catch(handleImageError).then(handleImageComplete);
		});
	});

	app.listen(port, function () {
		console.log('pointr worker ' + worker.id + ' is running on port', app.get('port'));
	});
};