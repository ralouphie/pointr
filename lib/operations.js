
var operations = {
	c: { name: 'crop', file: 'crop' },
	f: { name: 'focal', file: 'focal' },
	t: { name: 'thumb', file: 'thumb' },
	r: { name: 'resize', file: 'resize' },
	q: { name: 'quality', file: 'quality' },
	fmt: { name: 'format', file: 'format' },
	rot: { name: 'rotate', file: 'rotate' },
	flp: { name: 'flip', file: 'flip' },
	blr: { name: 'blur', file: 'filters/blur' },
	bri: { name: 'brightness', file: 'filters/brightness' },
	con: { name: 'contrast', file: 'filters/contrast' },
	exp: { name: 'exposure', file: 'filters/exposure' },
	gam: { name: 'gamma', file: 'filters/gamma' },
	hig: { name: 'highlights', file: 'filters/highlights' },
	hue: { name: 'hue', file: 'filters/hue' },
	inv: { name: 'invert', file: 'filters/invert' },
	sat: { name: 'saturation', file: 'filters/saturation' },
	sha: { name: 'shadows', file: 'filters/shadows' },
	shp: { name: 'sharpness', file: 'filters/sharpness' },
	vib: { name: 'vibrance', file: 'filters/vibrance' }
};

module.exports = { byKey: { }, byName: { } };
Object.keys(operations).forEach(function (key) {
	var info = operations[key];
	var run = require('./operations/' + info.file);
	var object = { key: key, name: info.name, run: run };
	module.exports.byKey[key] = object;
	module.exports.byName[info.name] = object;
});