var focal = require('./focal');
var options = JSON.parse(process.argv[2]);
focal(options, function (e, result) {

	if (e) {
		if (e instanceof Error) {
			var plain = { };
			Object.getOwnPropertyNames(e).forEach(function (key) {
				plain[key] = e[key];
			});
			process.stderr.write(JSON.stringify(plain));
		} else {
			process.stderr.write(JSON.stringify(e));
		}
	}

	var out = JSON.stringify(result || null);
	process.stdout.write(out || 'null');
});
