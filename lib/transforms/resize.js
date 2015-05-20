var Promise = require('bluebird');

module.exports = function (width, height, option) {
	return Promise.resolve({ image: this.image.resize(+width, +height, option) });
};