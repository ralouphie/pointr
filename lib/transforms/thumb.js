var Promise = require('bluebird');

module.exports = function (width, height) {
	return Promise.resolve(this.image.resize(+width, +height));
};