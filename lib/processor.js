var Promise = require('bluebird');
var errors  = require('./errors');
var operations = require('./operations');

module.exports = function (path, image) {
	return new Promise(function (resolve, reject) {

		var size;
		var parts = path.split(/\//);

		function applyNextOperation(image, newSize) {

			if (!image) {
				return reject(new Error('Last operation did not return an image'));
			}

			var operation = parts.shift();
			if (!operation) {
				return resolve(image);
			}

			var keyVal = operation.split(/:/);
			if (keyVal.length !== 2) {
				return reject(new errors.MalformedOperations('Invalid operation specified "' + part + '"'))
			}

			var key = keyVal[0];
			if (!operations[key]) {
				return reject(new errors.MalformedOperations('Unknown operation "' + key + '"'));
			}

			if (newSize) {
				size = newSize;
			}

			var values = keyVal[1].split(',');
			var context = { image: image, size: size };
			var promise = operations[key].apply(context, values);
			promise.then(applyNextOperation).catch(reject);
		}

		image.size({ bufferStream: true }, function (e, imageSize) {

			if (e) {
				return reject(new errors.ImageProcessingError('Could not get image size'));
			}

			size = imageSize;
			applyNextOperation(image);
		});
	});
};