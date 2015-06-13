var Promise = require('bluebird');

module.exports = function (amount) {
	return Promise.resolve({ image: this.image.modulate(+amount) });
};