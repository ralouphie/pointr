var Promise = require('bluebird');
var math = require('../math');
var errors = require('../errors');
var log = require('../log');

var allDetectionsOrder = [
	'face',
	'eye',
	'eyeglasses',
	'full_body',
	'car_side',
	'interesting_points'
];

var allDetections = {
	'face': { openCvDetection: 'FACE_CASCADE', color: 'red' },
	'eye': { openCvDetection: 'EYE_CASCADE', color: 'green' },
	'eyeglasses': { openCvDetection: 'EYEGLASSES_CASCADE', color: 'blue' },
	'full_body': { openCvDetection: 'FULLBODY_CASCADE', color: 'yellow' },
	'car_side': { openCvDetection: 'CAR_SIDE_CASCADE', color: 'purple' },
	'interesting_points': { openCvMethod: 'goodFeaturesToTrack', color: 'orange' }
};

module.exports = function () {

	var context = this;

	var args = Array.prototype.slice.call(arguments, 0);
	var argsSet = args.reduce(function (set, value, index) {
		set[value] = true;
		return set;
	}, { });

	return new Promise(function (resolve, reject) {

		var cv;
		var objectDetections;
		var objectSets = [];
		var options = ['draw', 'all'];

		function resolveFocal() {
			resolve({image: context.image, data: { detections: objectSets }});
		}

		try {
			cv = require('opencv');
		} catch (e) {
			log.error(
				'opencv_error_initializing: ' + (e.message || 'unknown'),
				{ exception: e, stack: e.stack || null }
			);
		}

		if (!cv) {
			return resolveFocal();
		}

		try {

			cv.readImage(context.image.sourceBuffer, function (e, openCvImage) {

				if (e) {
					log.error(
						'opencv_error_reading_image_callback: ' + (e.message || 'unknown'),
						{ exception: e, stack: e.stack || null }
					);
					return reject(e);
				}

				// Remove options from the arguments.
				options.forEach(function (option) {
					argsSet[option] && args.splice(args.indexOf(option), 1);
				});

				if (!args.length) {
					return reject(new errors.MalformedOperations('No focal detections specified'));
				} else {
					if (args.length === 1 && args[0] === 'auto') {
						objectDetections = allDetectionsOrder.slice(0);
					} else {
						objectDetections = args;
					}
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
								if (!argsSet.all) {
									return detectionsComplete();
								}
							}
							nextDetection();
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
								if (!argsSet.all) {
									return detectionsComplete();
								}
							}
							nextDetection();
						});
					} else {
						nextDetection();
					}
				}

				function detectionsComplete() {

					if (objectSets.length) {
						context.focal.primary = objectSets[0].center;
					}

					if (argsSet.draw) {
						drawDetections();
					}

					return resolveFocal();
				}

				function drawDetections() {
					objectSets.forEach(function (set) {
						var color = allDetections[set.detection].color || 'black';
						if (set.points) {
							set.points.forEach(function (point) {
								context.image.fill(color).stroke('transparent', 0).drawCircle(
									point[0] - 1,
									point[1] - 1,
									point[0] + 1,
									point[1] + 1
								);
							});
						}
						if (set.objects) {
							set.objects.forEach(function (object) {
								context.image.fill('transparent').stroke(color, 2).drawRectangle(
									object.x,
									object.y,
									object.x + object.width,
									object.y + object.height
								);
							});
						}
						context.image.fill(color).stroke('transparent', 0).drawCircle(
							set.center.x - 5,
							set.center.y - 5,
							set.center.x + 5,
							set.center.y + 5
						);
					});
					if (context.focal.primary) {
						context.image.fill('magenta').stroke('transparent', 0).drawCircle(
							context.focal.primary.x - 4,
							context.focal.primary.y - 4,
							context.focal.primary.x + 4,
							context.focal.primary.y + 4
						);
					}
				}

				nextDetection();
			});

		} catch (e) {
			log.error(
				'opencv_error_reading_image: ' + (e.message || 'unknown'),
				{ exception: e, stack: e.stack || null }
			);
			return resolveFocal();
		}
	});
};