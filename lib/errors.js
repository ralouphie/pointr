
var errors = {
	ImageRequestTimeout: 504,
	InvalidImageUrl: 400,
	NoImageReturned: 500,
	InvalidHost: 400,
	InvalidClient: 400,
	MissingSignature: 400,
	UnneededSignature: 400,
	MissingImageUrl: 400,
	MissingOperations: 400,
	MalformedOperations: 400,
	MalformedUrl: 400,
	InvalidSignature: 400,
	ImageProcessingError: 500,
	ImageSaveError: 500,
	ImageDownloadError: 500,
	RateLimitReached: 429
};

module.exports = { };
Object.keys(errors).forEach(function (key) {
	var statusCode = errors[key];
	module.exports[key] = function (message, previous) {
		Error.call(this);
		Error.captureStackTrace(this, arguments.callee);
		this.message = message || '';
		this.publicMessage = message || '';
		this.statusCode = statusCode || 500;
		this.type = key;
	}
});