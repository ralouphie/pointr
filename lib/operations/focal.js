var Promise = require('bluebird');
var math = require('../math');
var errors = require('../errors');
var log = require('../log');
var config = require('../config');
var openCvFocal = require('../opencv-focal');

var allDetectionsOrder = openCvFocal.detections.order;
var allDetections = openCvFocal.detections.all;

module.exports = function () {

	var context = this;

	var args = Array.prototype.slice.call(arguments, 0);
	var argsSet = args.reduce(function (set, value, index) {
		set[value] = true;
		return set;
	}, { });

	return new Promise(function (resolve, reject) {

		var auto = false;
		var objectDetections;
		var detectionResult = { };
		var options = ['draw', 'all'];
		var thumbPath;
		var thumbSize;

		function resolveFocal() {
			resolve({ image: context.image, data: { detections: detectionResult.detections || [] } });
		}

		// Remove options from the arguments.
		options.forEach(function (option) {
			argsSet[option] && args.splice(args.indexOf(option), 1);
		});

		if (!args.length) {
			return reject(new errors.MalformedOperations('No focal detections specified'));
		} else {
			if (args.length === 1 && args[0] === 'auto') {
				auto = true;
				objectDetections = allDetectionsOrder.slice(0);
			} else {
				objectDetections = args;
			}
		}

		try {
			context.getThumbSize().then(function (size) {
				thumbSize = size;
				return context.getThumbPath();
			}).then(function (path) {
				thumbPath = path;
				var openCvOptions = { image: thumbPath, detections: objectDetections, auto: auto, all: argsSet.all };
				openCvFocal(openCvOptions, detectionComplete);
			}).catch(reject);
		} catch (e) {
			log.error(
				'opencv_error_reading_image: ' + (e.message || 'unknown'),
				{ exception: e, stack: e.stack || null }
			);
			return reject(e);
		}

		function detectionComplete(e, result) {

			if (e) {
				log.error(
					'opencv_focal_detection_error: ' + (e.message || 'unknown'),
					{ exception: e, stack: e.stack || null }
				);
				return reject(e);
			}

			detectionResult = result;

			function translateThumbPoint(p) {
				var point;
				if (Array.isArray(p) && p.length >= 2) {
					point = [];
					point[0] = context.size.width * p[0] / thumbSize.width;
					point[1] = context.size.height * p[1] / thumbSize.height;
				} else {
					point = { };
					if ('undefined' !== typeof p.x) {
						point.x = context.size.width * p.x / thumbSize.width
					}
					if ('undefined' !== typeof p.y) {
						point.y = context.size.height * p.y / thumbSize.height
					}
					if ('undefined' !== typeof p.width) {
						point.width = context.size.width * p.width / thumbSize.width;
					}
					if ('undefined' !== typeof p.height) {
						point.height = context.size.height * p.height / thumbSize.height;
					}
				}
				return point;
			}

			if (result && result.detections && result.detections.length) {
				for (var i = 0; i < result.detections.length; i++) {
					var obj = result.detections[i];
					if (obj.points) {
						obj.points = obj.points.map(translateThumbPoint);
					}
					if (obj.center) {
						obj.center = translateThumbPoint(obj.center);
					}
					if (obj.objects) {
						obj.objects = obj.objects.map(translateThumbPoint);
					}
				}
				context.focal.primary = result.detections[0].center;
			}

			if (argsSet.draw) {
				drawDetections();
			}

			function drawDetections() {
				result.detections.forEach(function (set) {
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

			return resolveFocal();
		}
	});
};
