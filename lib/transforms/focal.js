var Promise = require('bluebird');
var cv = require('opencv');
var math = require('../math');

var allDetections = [
	'FACE_CASCADE',
	'EYE_CASCADE',
	'EYEGLASSES_CASCADE',
	'FULLBODY_CASCADE',
	'CAR_SIDE_CASCADE'
];

var allDetectionDrawColors = {
	'FACE_CASCADE': 'red',
	'EYE_CASCADE': 'green',
	'EYEGLASSES_CASCADE': 'blue',
	'FULLBODY_CASCADE': 'yellow',
	'CAR_SIDE_CASCADE': 'purple',
	'goodFeaturesToTrack': 'orange'
};

module.exports = function (type) {
	var context = this;
	return new Promise(function (resolve, reject) {

		cv.readImage(context.image.sourceBuffer, function (e, openCvImage) {

			if (e) {
				return reject(e);
			}

			var objectDetections = allDetections.slice();
			var objectSets = [];

			function nextDetection() {
				var detection = objectDetections.shift();
				if (!detection) {
					return detectionsComplete();
				}
				openCvImage.detectObject(cv[detection], { }, function (e, objects) {
					if (e) {
						return reject(e);
					} else if (objects && objects.length) {
						objectSets.push({
							detection: detection,
							center: math.calculateCenterMass(objects),
							objects: objects
						});
					}
					nextDetection();
				});
			}

			function detectionsComplete() {
				var points = openCvImage.goodFeaturesToTrack();
				if (points && points.length) {
					objectSets.push({
						detection: 'goodFeaturesToTrack',
						points: points,
						center: math.calculateCenterPoint(points)
					});
				}

				if (objectSets.length) {
					context.focal.primary = objectSets[0].center;
				}

				if (type === 'draw') {
					objectSets.forEach(function (set) {
						var color = allDetectionDrawColors[set.detection] || 'black';
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

				resolve(context.image);
			}

			nextDetection();
		});
	});
};