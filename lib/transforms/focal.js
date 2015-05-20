var Promise = require('bluebird');
var cv = require('opencv');
var math = require('../math');
var errors = require('../errors');

var allDetectionsOrder = [
	'face',
	'eye',
	'eyeglasses',
	'full_body',
	'car_site',
	'interesting_points'
];

var allDetections = {
	'face': { openCvDetection: 'FACE_CASCADE', color: 'red' },
	'eye': { openCvDetection: 'EYE_CASCADE', color: 'green' },
	'eyeglasses': { openCvDetection: 'EYEGLASSES_CASCADE', color: 'blue' },
	'full_body': { openCvDetection: 'FULLBODY_CASCADE', color: 'yellow' },
	'car_site': { openCvDetection: 'CAR_SIDE_CASCADE', color: 'purple' },
	'interesting_points': { openCvMethod: 'goodFeaturesToTrack', color: 'orange' }
};

module.exports = function () {
	var context = this;
	var args = Array.prototype.slice.call(arguments, 0);
	return new Promise(function (resolve, reject) {

		cv.readImage(context.image.sourceBuffer, function (e, openCvImage) {

			if (e) {
				return reject(e);
			}

			var objectDetections;
			var objectSets = [];

			if (!args.length) {
				return reject(new errors.MalformedOperations('No focal detections specified'));
			} else if (args.length === 1 && args[0] === 'auto') {
				objectDetections = allDetectionsOrder.slice(0);
			} else {
				objectDetections = args;
			}

			var openCvMethods = {
				goodFeaturesToTrack: function () {
					var points = openCvImage.goodFeaturesToTrack();
					if (points && points.length) {
						return Promise.resolve({
							points: points,
							center: math.calculateCenterPoint(points)
						});
					}
					return Promise.resolve(null);
				}
			};

			function nextDetection() {
				var detectionKey = objectDetections.shift();
				if (!detectionKey) {
					return detectionsComplete();
				}
				var detection = allDetections[detectionKey];
				if (!detection) {
					return reject(new errors.MalformedOperations('Unknown focal detection "' + detectionKey + '"'));
				}
				if (detection.openCvMethod) {
					openCvMethods[detection.openCvMethod](detectionKey).then(function (result) {
						if (result) {
							result.detection = detectionKey;
							objectSets.push(result);
							detectionsComplete();
						} else {
							nextDetection();
						}
					});
				} else if (detection.openCvDetection) {
					openCvImage.detectObject(cv[detection.openCvDetection], {}, function (e, objects) {
						if (e) {
							return reject(e);
						} else if (objects && objects.length) {
							objectSets.push({
								detection: detectionKey,
								center: math.calculateCenterMass(objects),
								objects: objects
							});
							detectionsComplete();
						} else {
							nextDetection();
						}
					});
				} else {
					nextDetection();
				}
			}

			function detectionsComplete() {

				if (objectSets.length) {
					context.focal.primary = objectSets[0].center;
				}

				resolve({ image: context.image, data: { detections: objectSets } });
			}

			nextDetection();
		});
	});
};