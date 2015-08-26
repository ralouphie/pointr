var Promise = require('bluebird');
var errors  = require('./errors');
var operations = require('./operations');

function processImage(path, image, imagePath) {
	return new Promise(function (resolve, reject) {

		var parts = path.split(/\//);

		var lastOperationInfo;
		var operationsRawData = [];
		var context = {

			image: image,
			imagePath: imagePath,
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

			if (lastOperationInfo) {
				lastOperationInfo.data = result.data || null;
				operationsRawData.push(lastOperationInfo);
			}

			context.imagePath = result.imagePath || context.imagePath;
			context.mime = result.mime || context.mime;
			context.image = result.image;
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
			var operationObject = operations.byKey[key] || operations.byName[key];
			if (!operationObject) {
				return reject(new errors.MalformedOperations('Unknown operation "' + key + '"'));
			}

			var values = keyVal[1].split(',');
			lastOperationInfo = {
				operationKey: operationObject.key,
				operationName: operationObject.name,
				operationParams: values
			};

			var promise = operationObject.run.apply(context, values);
			promise.then(applyNextOperation).catch(reject);
		}

		image.size(function (e, size) {

			if (e) {
				return reject(new errors.ImageProcessingError('Could not get image size'));
			}

			context.size = size;
			applyNextOperation({ image: image });
		});
	});
}

module.exports = processImage;