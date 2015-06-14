var Promise = require('bluebird');
var errors = require('../errors');

module.exports = function (w, h) {

	var allowedOptions = {
		min: '^',
		percent: '%',
		force: '!',
		shrink: '>',
		grow: '<'
	};

	var opt = { };
	var optionList = Array.prototype.slice.call(arguments, 2);
	for (var i = 0; i < optionList.length; i++) {
		var optionValue = optionList[i];
		if (opt[optionValue]) {
			return Promise.reject(new errors.MalformedOperations(
				'Cannot provide more than one resize option "' + optionValue + '"'
			));
		}
		if (!allowedOptions[optionValue]) {
			return Promise.reject(new errors.MalformedOperations(
				'Unknown resize option "' + optionValue + '"'
			));
		}
		opt[optionValue] = true;
	}

	if (opt.min && opt.area) {
		return Promise.reject(new errors.MalformedOperations(
			'Cannot provide both "min" and "area" to resize operation'
		));
	}
	if (opt.shrink && opt.grow) {
		return Promise.reject(new errors.MalformedOperations(
			'Cannot provide both "shrink" and "grow" to resize operation'
		));
	}

	var options = ['min', 'percent', 'area', 'force', 'shrink', 'grow']
		.map(function (o) { return opt[o] && allowedOptions[o]; })
		.filter(function (o) { return !!o; })
		.join('');

	var resizeArgs = [
		(w && w !== '_') ? +w : null,
		(h && h !== '_') ? +h : null,
		options || null
	];

	return Promise.resolve({ image: this.image.resize.apply(this.image, resizeArgs) });
};