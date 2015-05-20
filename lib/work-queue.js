module.exports = function (concurrency) {

	function Handle() {
		this.complete = function () {
			count -= 1;
			drain();
		};
	}

	var count = 0;
	var queue = [ ];
	var handle = new Handle();

	function drain() {
		if (!queue.length || count >= concurrency) {
			return;
		}
		count += 1;
		var f = queue.shift();
		f(handle);
	}

	return {
		drain: drain,
		queued: function () {
			return queue.length;
		},
		working: function () {
			return count;
		},
		post: function (f, startDraining, toFront) {

			if (toFront) {
				queue.unshift(f);
			} else {
				queue.push(f);
			}

			if ('undefined' === typeof startDraining || startDraining === true) {
				drain();
			}
			return handle;
		}
	};
};