var Promise = require('bluebird');

module.exports = function (width, height) {

	// Calculate the proper width and height for the thumb.
	var w;
	var h;
	var imageW = this.size.width;
	var imageH = this.size.height;
	if (width / height > imageW / imageH) {
		w = imageW;
		h = Math.max(0, imageW * (height / width));
	} else {
		w = Math.max(0, imageH * (width / height));
		h = imageH;
	}

	// Calculate the x and y for the crop, use the center point.
	var primaryFocalPoint = this.focal.primary;
	var cx = (primaryFocalPoint && primaryFocalPoint.x) || (imageW / 2);
	var cy = (primaryFocalPoint && primaryFocalPoint.y) || (imageH / 2);
	var x = cx - (w / 2);
	var y = cy - (h / 2);
	x = Math.max(0, Math.min(imageW - w, Math.round(x)));
	y = Math.max(0, Math.min(imageH - h, Math.round(y)));

	return Promise.resolve({ image: this.image.gravity('NorthWest').crop(w, h, x, y).resize(width, height, '!') });
};