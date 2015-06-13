var winston = require('winston');
var config = require('./config');
var logConfig = config.log || { };

module.exports = new winston.Logger({
	transports: [
		new winston.transports.Console({
			level: logConfig.level || 'debug',
			colorize: logConfig.colorize !== false,
			handleExceptions: logConfig.handleExceptions !== false,
			json: !!logConfig.json
		})
	],
	exitOnError: false
});

module.exports.stream = {
	write: function(message, encoding){
		logger.info(message);
	}
};