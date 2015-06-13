var Promise = require('bluebird');

module.exports = function (amount) {
	var low = 0.3;
	var high = 2.8;
	var gamma = low + ((amount / 100) * (high - low));
	return Promise.resolve({ image: this.image.gamma(gamma) });
};