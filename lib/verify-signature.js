var crypto = require('crypto');

module.exports = function (signature, path, keys) {
	return keys.some(function (key) {
		var hash = crypto.createHmac('sha1', key).update(path).digest('hex');
		return hash === signature;
	});
};