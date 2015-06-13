var Promise = require('bluebird');

module.exports = function (amount) {
	amount = +amount;
	var blackPoint = amount;
	var whitePoint = '';
	if (amount < 0) {
		blackPoint =
		whitePoint = -amount;
	}
	return Promise.resolve({ image: this.image.level(blackPoint) });
};