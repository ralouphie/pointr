
var operations = {
	c: 'crop',
	p: 'flip',
	f: 'focal',
	t: 'thumb',
	r: 'resize',
	o: 'rotate'
};

module.exports = { byKey: { }, byName: { } };
Object.keys(operations).forEach(function (key) {
	var name = operations[key];
	var run = require('./transforms/' + name);
	var object = { key: key, name: name, run: run };
	module.exports.byKey[key] = object;
	module.exports.byName[name] = object;
});