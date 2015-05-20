module.exports = {

	calculateCenterMass: function (rectangles) {

		var centerX = 0;
		var centerY = 0;
		var totalWeight = 0;

		rectangles.forEach(function (r) {
			var weight = r.width * r.height;
			centerX += weight * (r.x + (r.width / 2));
			centerY += weight * (r.y + (r.height / 2));
			totalWeight += weight;
		});

		return {
			x: centerX / totalWeight,
			y: centerY / totalWeight
		};
	},

	calculateCenterPoint: function (points) {

		var centerX = 0;
		var centerY = 0;

		points.forEach(function (p) {
			centerX += p[0];
			centerY += p[1];
		});

		return {
			x: centerX / points.length,
			y: centerY / points.length
		};
	}

};