var Promise = require('bluebird');

var formatInfo = {
	jpg: { format: 'JPEG', mime: 'image/jpeg' },
	png: { format: 'PNG', mime: 'image/png' },
	gif: { format: 'GIF', mime: 'image/gif' },
	bmp: { format: 'BMP', mime: 'image/bmp' }
};

module.exports = function (format) {
	var info = formatInfo[format];
	if (!info) {
		return Promise.reject(new errors.MalformedOperations(
			'Unknown format option "' + format + '"'
		));
	}
	return Promise.resolve({
		image: this.image.setFormat(info.format),
		mime: info.mime
	});
};