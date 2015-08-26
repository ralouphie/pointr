var crypto = require('crypto');
var cluster = require('cluster');
var ms = require('ms');
var config = require('./config');
var errors = require('./errors');
var log = require('./log');
var clients = config.clients || { };

// Get the set of valid host names.
var validHostnameSet =
	config.validHostnames &&
	Array.isArray(config.validHostnames) &&
	config.validHostnames.reduce(function (set, value, index) {
		set[value] = true;
		return set;
	}, { });

// Get the IP address header.
var ipHeader = null;
if (config.ipHeader) {
	ipHeader = config.ipHeader;
	if (cluster.isMaster) {
		log.info('Using rate limiting IP header "' + ipHeader + '"');
	}
}

// Get the rate limiter instance.
var rateLimiter = null;
if (config.rateLimiter) {
	var limiterType = Object.keys(config.rateLimiter);
	if (limiterType.length !== 1) {
		throw new Error('Exactly one "rateLimiter" must be defined in config.');
	}
	limiterType = limiterType[0];
	var RateLimiter = require('./rate-limiter/' + limiterType + '.js');
	rateLimiter = new RateLimiter(config.rateLimiter[limiterType]);
}

// Rate limit unique ID builders.
var rateLimitUniqueBuilder = {
	ip: function rateLimitUniqueBuilderIp(req) {
		return (ipHeader && req.header(ipHeader)) || req.ip;
	}
};

function verifySignature(signature, path, key) {
	var hash = crypto.createHmac('sha1', key).update(path).digest('hex');
	return hash === signature;
}

function buildClient(clientName, client) {

	// Read secret key or unsafe options.

	if (client.secret && client.unsafe) {
		throw new Error('Client "' + clientName + '" cannot have both "secret" and "unsafe" options.');
	}
	if (!client.secret && !client.unsafe) {
		throw new Error('Client "' + clientName + '" must either "secret" or "unsafe" option.');
	}
	if (client.secret) {
		client.signatureRequired = true;
		client.verifySignature = function clientVerifySignature(signature, path) {
			return verifySignature(signature, path, client.secret);
		};
	} else {
		client.signatureRequired = false;
	}

	// Read rate limit options.

	if (!client.rateLimit) {
		throw new Error('Client "' + clientName + '" "rateLimit" must be an object or "none".');
	}
	if (client.rateLimit === 'none') {

		client.performRateLimit = false;

	} else {

		if (!rateLimiter) {
			throw new Error('No "rateLimiter" defined in config.');
		}
		if (!client.rateLimit.by) {
			throw new Error('Missing "by" option for "rateLimit" config in client "' + clientName + '".');
		}
		var rateLimitBuilder = rateLimitUniqueBuilder[client.rateLimit.by];
		if (!rateLimitBuilder) {
			throw new Error('Invalid "by" option for "rateLimit" config in client "' + clientName + '".');
		}
		if (!client.rateLimit.max || 'number' !== typeof client.rateLimit.max) {
			throw new Error('Missing/invalid "max" option for "rateLimit" config in client "' + clientName + '".');
		}
		var perMillis = -1;
		var perMillisUnits = {
			perMillis: 1,
			perSeconds: 1000,
			perMinutes: 60 * 1000,
			perHours: 60 * 60 * 1000,
			perDays: 24 * 60 * 60 * 1000
		};
		Object.keys(client.rateLimit).forEach(function (rateLimitKey) {
			if (['by', 'max'].indexOf(rateLimitKey) >= 0) {
				return;
			}
			if (!perMillisUnits[rateLimitKey]) {
				throw new Error('Unknown "' + rateLimitKey + '" option for "rateLimit" config in client "' + clientName + '".');
			}
			if (perMillis >= 0) {
				throw new Error('Cannot define more than one "per" time for "rateLimit" config in client "' + clientName + '".');
			}
			perMillis = Math.round(client.rateLimit[rateLimitKey] * perMillisUnits[rateLimitKey]);
		});
		if (perMillis < 0) {
			throw new Error(
				'Must have at least one time ("perMinutes", "perHours", etc.) ' +
				'defined for "rateLimit" config in client "' + clientName + '".'
			);
		}
		client.performRateLimit = true;
		client.getRateLimitId = function () {
			return clientName + ':' + rateLimitBuilder.apply(this, arguments);
		};
		client.rateLimitMax = client.rateLimit.max;
		client.rateLimitMillis = perMillis;
		client.rateLimit = rateLimiter.create(client.rateLimitMax, client.rateLimitMillis);
	}
}

Object.keys(clients).forEach(function (clientName) {
	buildClient(clientName, clients[clientName]);
});

var firstPathChunkRegex = new RegExp('^/[^/]+/');

function authorize(req, res, next) {

	// Verify the hostname.

	if (validHostnameSet && !validHostnameSet[req.hostname]) {
		return next(new errors.InvalidHost('Unknown host'));
	}

	// Verify the arguments.

	if (!req.params || !req.params.client) {
		return next(new errors.InvalidClient('Client not provided'));
	}
	var client = clients[req.params.client];
	if (!client) {
		return next(new errors.InvalidClient('Invalid client'));
	}
	if (!req.params.operations) {
		return next(new errors.MissingOperations('Operations not provided'));
	}
	if (!req.params.imageUrl) {
		return next(new errors.MissingImageUrl('Image URL not provided'));
	}

	// Verify the signature.

	if (client.signatureRequired) {
		if (!req.params.signature) {
			return next(new errors.MissingSignature('Signature not provided'));
		}
		var pathVersions = [
			req.params.operations + '/' + req.params.imageUrl,
			req.params.operations + '/' + req.params.imageUrl.replace(/(https?):\/\/?/, '$1:/')
		];
		var invalid = true;
		for (var i = 0; i < pathVersions.length; i++) {
			if (client.verifySignature(req.params.signature, pathVersions[i])) {
				invalid = false;
				break;
			}
		}
		if (invalid) {
			return next(new errors.InvalidSignature('Bad signature'));
		}
	} else if (req.params.signature) {
		return next(new errors.UnneededSignature('Signature not needed'));
	}

	// Check the rate limit.

	if (client.performRateLimit) {
		var rateLimitId = client.getRateLimitId(req);
		client.rateLimit(rateLimitId, function (e, limit) {

			if (e) {
				return next(e);
			}

			res.set('x-ratelimit-limit', limit.allowMax);
			res.set('x-ratelimit-remaining', Math.max(0, limit.allowRemaining - 1));
			res.set('x-ratelimit-reset', limit.resetMillis);

			// We still have requests left for this rate limit.
			if (limit.allowRemaining) {
				return next();
			}

			// Rate limit reached.
			var delta = (limit.resetMillis * 1000) - Date.now() | 0;
			var after = limit.resetMillis - (Date.now() / 1000) | 0;
			res.set('retry-after', after);
			return next(new errors.RateLimitReached(
				'Rate limit exceeded, retry in ' + ms(delta, { long: true })
			));

		});
	} else {
		return next();
	}
}

module.exports = authorize;