var redis = require('redis');
var Limiter = require('ratelimiter');

/**
 * Create a new Redis rate limiter.
 *
 * @param {number} rateLimitConfig.port The port the Redis instance is on.
 * @param {string} rateLimitConfig.host The host the Redis instance is on.
 * @param {string} [rateLimitConfig.pass] The password to use when connecting to Redis.
 *
 * @constructor
 */
function RateLimiterRedis(rateLimitConfig) {

	if (!rateLimitConfig) {
		throw new Error('rate_limiter.redis config not provided');
	}
	if (!rateLimitConfig.port) {
		throw new Error('rate_limiter.redis config missing port');
	}
	if (!rateLimitConfig.host) {
		throw new Error('rate_limiter.redis config missing host');
	}
	var options = { };
	if (rateLimitConfig.pass) {
		options.auth_pass = rateLimitConfig.pass;
	}

	this.db = redis.createClient(rateLimitConfig.port, rateLimitConfig.host, options);
}

RateLimiterRedis.prototype.create = function (allowMax, perMillis) {
	var self = this;
	return function rateLimitRedis(uniqueId, callback) {
		var redisLimiter = new Limiter({ db: self.db, id: uniqueId, max: allowMax, duration: perMillis });
		redisLimiter.get(function redisLimiterResponse(e, limit) {
			if (e) {
				callback(e);
			} else {
				callback(null, {
					allowMax: limit.total,
					allowRemaining: limit.remaining,
					resetMillis: limit.reset
				});
			}
		});
	};
};

module.exports = RateLimiterRedis;