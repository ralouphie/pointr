var Promise = require('bluebird');
var errors  = require('./errors');
var operations = require('./operations');

function processImage(path, image) {
	return new Promise(function (resolve, reject) {

		var parts = path.split(/\//);

		var lastOperationKey;
		var operationsRawData = [];
		var context = {

			image: image,
			size: null,
			focal: {

				primary: null,
				secondary: null
			}
		};

		function applyNextOperation(result) {

			if (!result.image) {
				return reject(new Error('Last operation did not return an image'));
			}

			if (lastOperationKey) {
				operationsRawData.push({
					operation: lastOperationKey,
					data: result.data || null
				});
			}

			var operation = parts.shift();
			if (!operation) {
				context.operationsRawData = operationsRawData;
				return resolve(context);
			}

			var keyVal = operation.split(/:/);
			if (keyVal.length !== 2) {
				return reject(new errors.MalformedOperations('Invalid operation specified "' + operation + '"'))
			}

			var key = keyVal[0];
			var operationRun = operations.byKey[key] || operations.byName[key];
			if (!operationRun) {
				return reject(new errors.MalformedOperations('Unknown operation "' + key + '"'));
			}

			lastOperationKey = key;
			context.image = result.image;
			var values = keyVal[1].split(',');
			var promise = operationRun.apply(context, values);
			promise.then(applyNextOperation).catch(reject);
		}

		image.size({ bufferStream: true }, function (e, size) {

			if (e) {
				return reject(new errors.ImageProcessingError('Could not get image size'));
			}

			context.size = size;
			applyNextOperation({ image: image });
		});
	});
}

module.exports = processImage;