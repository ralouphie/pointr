var Promise = require('bluebird');
var errors = require('../errors');

module.exports = function (direction) {
	if (direction === 'h') {
		return Promise.resolve({ image: this.image.flip() });
	} else if (direction === 'v') {
		return Promise.resolve({ image: this.image.flop() });
	} else {
		return Promise.reject(new errors.MalformedOperations('Unknown flip direction "' + direction + '"'));
	}
};