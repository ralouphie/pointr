var opencv = require('opencv');
var math = require('../math');

var detections = {
	order: [
		"face",
		"eye",
		"eyeglasses",
		"full_body",
		"car_side",
		"interesting_points"
	],
	all: {
		"face": { "openCvDetection": "FACE_CASCADE", "color": "red" },
		"eye": { "openCvDetection": "EYE_CASCADE", "color": "green" },
		"eyeglasses": { "openCvDetection": "EYEGLASSES_CASCADE", "color": "blue" },
		"full_body": { "openCvDetection": "FULLBODY_CASCADE", "color": "yellow" },
		"car_side": { "openCvDetection": "CAR_SIDE_CASCADE", "color": "purple" },
		"interesting_points": { "openCvMethod": "goodFeaturesToTrack", "color": "orange" }
	}
};

function focal(options, callback) {

	var objectSets = [];

	function reject(e) {
		callback(e);
	}

	function complete() {
		var primary = objectSets.length ? objectSets[0].center : null;
		callback(null, { primary: primary, detections: objectSets });
	}

	if (!options.image) {
		return reject(new Error('Missing image option'));
	}

	opencv.readImage(options.image, function (e, image) {

		if (e) {
			return callback(e);
		}
		if (!image || !image.width() || !image.height()) {
			return callback(new Error('Could not read image (' + options.image + ')'));
		}

		var objectDetections;
		if (options.auto) {
			objectDetections = detections.order.slice(0);
		} else if (!options.detections || !Array.isArray(options.detections) || !options.detections.length) {
			return reject(new Error('Missing/invalid detections in options'));
		} else {
			objectDetections = options.detections.slice(0);
		}

		var openCvMethods = {
			goodFeaturesToTrack: function (cb) {
				var points = image.goodFeaturesToTrack();
				if (points && points.length) {
					return cb(null, {
						points: points,
						center: math.calculateCenterPoint(points)
					});
				}
				return cb();
			}
		};

		nextDetection();
		function nextDetection() {

			var detectionKey = objectDetections.shift();
			if (!detectionKey) {
				return complete();
			}

			var detection = detections.all[detectionKey];
			if (!detection) {
				return reject(new Error('Unknown focal detection "' + detectionKey + '"'));
			}

			if (detection.openCvMethod) {

				openCvMethods[detection.openCvMethod](function (e, result) {
					if (e) {
						return reject(e);
					} else if (result) {
						result.detection = detectionKey;
						objectSets.push(result);
						if (!options.all) {
							return complete();
						}
					}
					nextDetection();
				});

			} else if (detection.openCvDetection) {

				image.detectObject(opencv[detection.openCvDetection], { }, function (e, objects) {
					if (e) {
						return reject(e);
					} else if (objects && objects.length) {
						objectSets.push({
							detection: detectionKey,
							center: math.calculateCenterMass(objects),
							objects: objects
						});
						if (!options.all) {
							return complete();
						}
					}
					nextDetection();
				});

			} else {
				nextDetection();
			}
		}
	});
}

focal.detections = detections;
module.exports = focal;
