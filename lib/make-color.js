module.exports = function (color, defaultColor) {
	if (color) {
		if (color.match(/[a-f0-9]{6}/) || color.match(/[a-f0-9]{3}/)) {
			return '#' + color;
		} else if (color.match(/[a-z ]+/i)) {
			return color;
		}
	}
	return defaultColor || 'white';
};