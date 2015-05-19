var Promise = require('bluebird');

module.exports = function (width, height, x, y) {
	return Promise.resolve(this.image.crop(+width, +height, +x, +y));
};