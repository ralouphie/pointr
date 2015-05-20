
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
	module.exports.byKey[key] = run;
	module.exports.byName[name] = run;
});