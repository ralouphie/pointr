var Promise = require('bluebird');

module.exports = function (quality) {
	return Promise.resolve({ image: this.image.quality(Math.max(0, Math.min(100, +quality))) });
};