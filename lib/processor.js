var Promise = require('bluebird');
var tmp = require('tmp');
var gm = require('gm');
var config = require('./config');
var errors  = require('./errors');
var operations = require('./operations');

function processImage(path, image, imagePath) {
	return new Promise(function (resolve, reject) {

		var parts = path.split(/\//);
		var thumbPromisePath;
		var thumbPromiseSize;
		var thumbCleanup;
		var thumbMaxW = 500;
		var thumbMaxH = 500;

		function cleanup() {
			if (thumbCleanup) {
				thumbCleanup();
				thumbCleanup = null;
			}
		}

		function processResolve(result) {
			cleanup();
			resolve(result);
		}

		function processReject(error) {
			cleanup();
			reject(error);
		}

		function getThumbSize() {
			if (thumbPromiseSize) {
				return thumbPromiseSize;
			}
			return thumbPromiseSize = getThumbPath().then(function (thumbPath) {
				return new Promise(function (resolve, reject) {
					gm(thumbPath).size(function (e, size) {
						e ? reject(e) : resolve(size);
					});
				});
			});
		}

		function getThumbPath() {
			if (thumbPromisePath) {
				return thumbPromisePath;
			}
			return thumbPromisePath = new Promise(function (resolve, reject) {
				tmp.file({ prefix: '__thumb_', dir: config.tempDir || undefined }, function (e, path, handle, cleanup) {
					thumbCleanup = cleanup;
					if (e) {
						reject(e);
					} else {
						gm(imagePath).resize(thumbMaxW, thumbMaxH).write(path, function (e) {
							e ? reject(e) : resolve(path);
						});
					}
				});
			});
		}

		var lastOperationInfo;
		var operationsRawData = [];
		var context = {

			image: image,
			imagePath: imagePath,
			size: null,
			focal: {

				primary: null,
				secondary: null
			},

			getThumbPath: getThumbPath,
			getThumbSize: getThumbSize
		};

		function applyNextOperation(result) {

			if (!result.image) {
				return processReject(new Error('Last operation did not return an image'));
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
				return processResolve(context);
			}

			var keyVal = operation.split(/:/);
			if (keyVal.length !== 2) {
				return processReject(new errors.MalformedOperations('Invalid operation specified "' + operation + '"'))
			}

			var key = keyVal[0];
			var operationObject = operations.byKey[key] || operations.byName[key];
			if (!operationObject) {
				return processReject(new errors.MalformedOperations('Unknown operation "' + key + '"'));
			}

			if (Array.isArray(config.disableOperations) && config.disableOperations.indexOf(operationObject.name) >= 0) {
				applyNextOperation(result);
			} else {
				var values = keyVal[1].split(',');
				lastOperationInfo = {
					operationKey: operationObject.key,
					operationName: operationObject.name,
					operationParams: values
				};
				var promise = operationObject.run.apply(context, values);
				promise.then(applyNextOperation).catch(processReject);
			}
		}

		image.size(function (e, size) {

			if (e) {
				return processReject(new errors.ImageProcessingError('Could not get image size'));
			}

			context.size = size;
			applyNextOperation({ image: image });
		});
	});
}

module.exports = processImage;