var Promise = require('bluebird');

module.exports = function () {
	return Promise.resolve({ image: this.image.negative() });
};