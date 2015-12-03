var Promise = require('bluebird');
var tmp = require('tmp');
var fs = require('fs');
var path = require('path');
var request = require('request');
var config = require('./config');
var log = require('./log');
var errors  = require('./errors');

function downloadImage(url, options) {
	return new Promise(function (resolve, reject) {

		// Create a temporary file for the download.
		var prefix = url.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/, '').substr(0, 80) + '_';
		var tmpOptions = {
			prefix: prefix,
			dir: config.tempDir || undefined
		};
		tmp.file(tmpOptions, function downloadImageTempFileCreated(e, path, handle, cleanup) {

			var clean = false;
			function cleanupWrapper() {
				if (!clean) {
					clean = true;
					cleanup && cleanup();
				}
			}

			var rejected = false;
			function handleError(error) {
				if (!rejected) {
					rejected = true;
					cleanupWrapper();
					reject(error);
				}
			}

			var stream;
			try {
				stream = fs.createWriteStream(path);
			} catch (e) {
				log.error('temp_write_stream_failed', { tempPath: path, exception: e });
				return handleError(new errors.ImageSaveError(null, e));
			}
			if (!stream) {
				log.error('temp_write_stream_failed_empty', { tempPath: path, exception: e });
				return handleError(new errors.ImageSaveError(null, e));
			}

			// If there was an error creating the temp file, log it and reject.
			if (e) {
				log.error('temp_for_download_failed', { tempPrefix: prefix, exception: e });
				return handleError(new errors.ImageSaveError(null, e));
			}

			// Start downloading the image.
			var imageReq;
			try {
				imageReq = request.get(url, options);
			} catch (e) {
				log.error('image_request_get_error', {
					exception: e,
					downloadStatus: -1,
					downloadUrl: url,
					downloadResponse: null
				});
				handleError(new errors.InvalidImageUrl('Image URL is invalid'));
				return;
			}
			var response;
			var ok = false;

			imageReq.on('response', function downloadImageResponse(res) {
				response = res;
				ok = res.statusCode === 200;
				if (!ok) {
					log.error('image_download_non_200: ' + url, {
						downloadStatus: res.statusCode,
						downloadUrl: url,
						downloadResponse: res
					});
					handleError(new errors.ImageDownloadError());
				}
			});

			imageReq.on('end', function downloadImageEnd() {
				if (ok && response) {
					resolve({ path: path, response: response, cleanup: cleanupWrapper });
				} else {
					handleError(new errors.ImageDownloadError());
				}
			});

			imageReq.on('error', function downloadImageError(e) {
				if (e && e.code && e.code === 'ETIMEDOUT') {
					log.error('image_download_error_timeout', {
						exception: e,
						downloadStatus: -1,
						downloadUrl: url,
						downloadResponse: null
					});
					handleError(new errors.ImageRequestTimeout('Timeout requesting image'));
				} else {
					log.error('image_download_error', {
						exception: e,
						downloadStatus: -2,
						downloadUrl: url,
						downloadResponse: null
					});
					handleError(e);
				}
			});

			// Pipe the HTTP response body to the file.
			imageReq.pipe(stream);
		});
	});
}

module.exports = downloadImage;