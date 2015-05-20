var Promise = require('bluebird');
var makeColor = require('../make-color');

module.exports = function (degrees, color) {
	return Promise.resolve({ image: this.image.rotate(makeColor(color), +degrees) });
};