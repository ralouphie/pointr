var express = require('express');
var request = require('request');
var gm = require('gm');

var app = express();
var processor = require('./lib/processor');
var workQueue = require('./lib/work-queue')(1);

app.get(/^\/([a-z0-9]+)\/(.+)\/(https?:\/\/.+)/, function handleImageRequest(req, res) {
	workQueue.post(function (work) {

		var key = req.params[0];
		var operations = req.params[1];
		var imageUrl = req.params[2];
		var imageReq = request.get(imageUrl);
		var imageGm = gm(imageReq);

		function handleImageError(e) {
			work.complete();
			res.status(e.statusCode || 500).json({
				error: true,
				errorType: e.type || null,
				errorMessage : e.message || null
			});
		}

		function handleImageComplete(image) {
			work.complete();
			image.stream().pipe(res);
		}

		imageReq.on('error', handleImageError);
		processor(operations, imageGm).catch(handleImageError).then(handleImageComplete);
	});
});

app.listen(3000);