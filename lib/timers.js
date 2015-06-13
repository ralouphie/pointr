function Timers() { }

Timers.prototype.start = function (name) {
	this[name] = { start: new Date(), millis: null };
};

Timers.prototype.stop = function (name) {
	var timer = this[name];
	if (timer) {
		timer.millis = new Date() - timer.start;
	}
};

module.exports = Timers;