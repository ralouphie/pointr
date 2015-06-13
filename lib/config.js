yaml = require('js-yaml');
fs = require('fs');

// Read the config file.
var configFile = process.argv[2] || process.env.POINTR_CONFIG_FILE;
if (!configFile) {
	throw new Error('Missing config file as argument or as environment variable POINTR_CONFIG_FILE');
}

module.exports = yaml.safeLoad(fs.readFileSync(configFile, { encoding: 'utf8' })) || { };