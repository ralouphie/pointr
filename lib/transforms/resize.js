var Promise = require('bluebird');

module.exports = function (width, height, option) {
	return Promise.resolve(this.image.resize(+width, +height, option));
};