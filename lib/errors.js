
var errors = {
	MalformedOperations: 400,
	ImageProcessingError: 500
};

module.exports = { };
Object.keys(errors).forEach(function (key) {
	var statusCode = errors[key];
	module.exports[key] = function (message) {
		Error.call(this);
		Error.captureStackTrace(this, arguments.callee);
		this.message = message || '';
		this.statusCode = statusCode || 500;
		this.type = key;
	}
});