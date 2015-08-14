var winston = require('winston');
var config = require('./config');
var logConfig = config.log || { };
var json = logConfig.json !== false;

var log = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({
			level: logConfig.level || 'debug',
			colorize: !json && logConfig.colorize !== false,
			handleExceptions: logConfig.handleExceptions !== false,
			json: json,
			timestamp: true,
			stringify: json,
			prettyPrint: !json
		})
	],
	exitOnError: false
});

module.exports = log;
