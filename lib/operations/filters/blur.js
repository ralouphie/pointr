var Promise = require('bluebird');

module.exports = function (amount) {

	var percent = (+amount) / 100;
	var minRadius = 0;
	var maxRadius = 100;
	var minSigma = 0;
	var maxSigma = 15;

	var radius = minRadius + ((maxRadius - minRadius) * percent);
	var sigma = minSigma + ((maxSigma - minSigma) * percent);

	if (radius <= 0 || sigma <= 0) {
		return Promise.resolve({ image: this.image });
	} else {
		return Promise.resolve({ image: this.image.blur(radius, sigma) });
	}
};