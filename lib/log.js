var winston = require('winston');
var config = require('./config');
var logConfig = config.log || { };

var log = new winston.Logger({
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

module.exports = log;
