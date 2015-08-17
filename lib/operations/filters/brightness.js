var Promise = require('bluebird');

module.exports = function (amount) {

	//    0 = unchanged
	//  100 = 100% brighter
	// -100 = 100% darker
	var brightness = 100 + (+amount);

	return Promise.resolve({ image: this.image.modulate(brightness) });
};