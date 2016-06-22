# Pointr

A simple image service using Node.js, Express, GraphicsMagick, and OpenCV.

## What's it do?

- (Re)sizing, cropping
- Image formatting (JPG, PNG, ...)
- Reduce quality (for fast downloads)
- Filters (brightness, hue, contrast, blur, ...)

## Installation

1. Install Node.js
2. Install GraphicsMagick
3. Install OpenCV
4. `npm install`
5. Create a config YAML file based on the `config.example.yml`

## Running

`bin/pointr production_config.yml`

### Configuration

Pointr uses a config file to control all options. See `config.example.yml` as an example and for more details.

|Config Option||
|:---|:---|
|`port`|Optional. Defaults to `3000`. The port to run the service on.|
|`log.json`|Optional. Defaults to `true`. Whether to use JSON for output logging.|
|`log.colorize`|Optional. Defaults to `false`. Whether to color the log.|
|`log.level`|Optional. Defaults to `debug`. The logging level.|
|`log.disableAccessLogging`|Optional. Defaults to `false`. Whether to disable access logging.|
|`tempDir`|Optional. Defaults to system temp dir. Where to put temporary images being processed.|
|`validHostnames`|Optional. A list of valid host names the service will respond to.|
|`instances.min`|Optional. Defaults to `2`. The minimum number of instances to start.|
|`instances.max`|Optional. Defaults to `128`. The maximum number of instances to start.|
|`requestTimeout`|Optional. Defaults to `5`. Timeout (in seconds) when requesting images.|
|`downloader.userAgent`|Optional. Defaults to `pointr`. A user agent header string to use when downloading images.|
|`cache.ttlDefault`|Recommended. Defaults to `2592000` (30 days). Cache time if cache control is not present in image response.|
|`cache.ttlMin`|Recommended. Defaults to `3600` (one hour). Minimum cache time for the `Cache-Control` header.|
|`cache.ttlMax`|Recommended. Defaults to `2592000` (30 days). Maximum cache time for the `Cache-Control` header.|
|`trustProxy`|Optional. The `trust proxy` setting fot the express server.|
|`ipHeader`|Recommended. The header to use for the end-client (browser) IP address.|
|`rateLimiter`|Recommended. A rate limiter to use. See `config.example.yml` for an example.|
|`clients`|Required. The set of clients that will be using the service. See `config.example.yml` for an example.|

The `cache` configuration above can also be set per client. See the example configuration below.

#### Example Configuration

```yml
# Optional. Defaults to 3000. The port for the service to run on.
port: 3000

# Optional. Logging configuration
log:
  json: true                  # Use JSON logging
  colorize: false             # Do not color the logs
  level: debug                # Log level
  disableAccessLogging: false # Whether to disable access logging

# Optional. Defaults to the system temp directory.
tempDir: /tmp

# Optional. A list of valid hostnames for the service.
# This is useful if you want to hide the origin hostname (e.g. s3cr3th0s1.example.com).
validHostnames:
  - localhost

# Optional. The number of pointr instances to run.
# This will default to the number of CPUs on the system bounded by the min and max.
instances:
  min: 2
  max: 64

# Optional. Timeout (in seconds) when requesting images.
requestTimeout: 5

# Recommended. The header to use for the end-client (browser) IP address.
# This is necessary if this service is an origin,
# fronted by a CDN that provides its own header for the client IP address.
# For example, Akamai provides a "True-Client-IP" header.
ipHeader: True-Client-IP

# How long to cache images. This will set the cache control header for the CDN.
cache: 
  ttlDefault: 2592000   # Default to 30 days (2592000 seconds).
  ttlMin: 3600          # Minimum 1 hour (3600 seconds).
  ttlMax: 2592000       # Maximum 30 days (2592000 seconds).

# Recommended. The rate limiter to use.
# The rate limiter should have a type (key) to a set of options.
rateLimiter:

  # Use a redis rate limiter.
  redis:
    # Required. The host where the redis instance lives.
    host: localhost
    # Required. The port the redis instance is running on.
    port: 6379
    # Optional. The redis password.
    # pass: 3x@mp13

# The set of clients that will be using the service.
# Each client is a key to a set of options for that client.
clients:

  # A demo client. A unsafe, rate limited client for demo purposes.
  demo:
    # Client-specific cache time settings.
    cache:
      ttlDefault: 3600
      ttlMin: 3600
      ttlMax: 3600
    # Allow requests without a signature.
    unsafe: true
    # Rate limit by end-client (browser) IP; allow 10 reqs per hour.
    rateLimit: { by: ip, max: 10, perHours: 1 }

  # An example of an internal tool that has no rate limit
  # because the secret key is not exposed.
  internal_tool:
    # Use this secret key for generating signatures.
    secret: "1nt3rn@lT00l"
    # No rate limit.
    rateLimit: none

  # An example of a client that has a secret in addition to a
  # rate limit.
  mobile:
    # Use this secret key for generating signatures.
    secret: "M0b1l3*1m@g3*R351z1ng!"
    # Rate limit by end-client (browser) IP; allow 1000 reqs per hour.
    rateLimit: { by: ip, max: 1000, perHours: 1 }
```


## API

The Pointr API takes a **client key**, followed by an optional **security signature** 
(depending on whether a `secret` was configured for the application, see the configuration example),
followed by a sequence of **operations**, followed by the **image URL** to manipulate.

The format looks like the following:

`http://<pointr_service_host>/<client>[:<signature>]/<operation1>/<operation2>/.../?url=<url_encoded_image_url>`

### Signature

To access the API through an safe client (one that uses a `secret`, see config above), you must generate a **signature**.

To generate a security signature, you generate a SHA-1 HMAC (Hashed Message Authentication Code) of the portion of the
URL that comes after the client and signature.

Format: `<operation1>/<operation2>/.../?url<url_encoded_image_url>`
Example: `thumb:300,300/flip:h/?url=http%3A%2F%2Fexample.com%2Fmy-image.jpeg`

If the above string of operations and image URL is `message`, The algorithm looks like the following:

### Examples

#### Pseudocode

```
signature = sha1_hmac_hex(clientSecret, message)
```

##### Node.js

```
var crypto = require('crypto');
var signature = crypto.createHmac('sha1', clientSecret).update(message).digest('hex');`
```

##### PHP

```
$signature = hash_hmac('sha1', $message, $clientSecret);
```

#### Making Requests

Once the signature is computed, you can make requests using the client ID and signature in the URL:

`http://<pointr_service_host>/<client>:<signature>/<operation1>/<operation2>/.../?url=<url_encoded_image_url>`


### Operations

Operations contain a **name**, followed by a colon `:`, followed by a comma-delimited list of **parameters**.

The format looks like the following:

`<operation_name>:<param1>,<param2>,...`

- - -

#### `resize`, `r`

Resize the image to the given size.

```
http://<host>/<client>[:<signature>]/resize:<width>,<height>[,<options>]/<image_url>

http://<host>/<client>[:<signature>]/resize:500,300/<image_url>
http://<host>/<client>[:<signature>]/r:600,250,force/<image_url>
```

|Argument||
|:---|:---|
|`width`|The width.|
|`height`|The height.|
|`options`|Comma-delimited options for the resize (see below).|

##### Resize Options

|Options||
|:---|:---|
|`force`|Force the resize to the width and height specified.|
|`shrink`|Only resize the image if it will shrink.|
|`grow`|Only resize the image if it will grow.|
|`min`|Treat the width/height as **minimum** values instead of maximum values.|
|`percent`|Treat the width/height as percentages.|

- - -

#### `thumb`, `t`

Create a thumbnail for the given size (takes the focal point into consideration).

Thumbnails will automatically crop the image, trying to get as much in the frame as possible.  
If not all of the image can fit, the focal point will be used as the center point for the crop while
keeping the image within the bounds.

```
http://<host>/<client>[:<signature>]/thumb:<width>,<height>/<image_url>

http://<host>/<client>[:<signature>]/thumb:500,300/<image_url>
http://<host>/<client>[:<signature>]/t:600,250/<image_url>
```

|Argument||
|:---|:---|
|`width`|The width for the thumbnail (in pixels).|
|`height`|The height for the thumbnail (in pixels).|

- - -

#### `crop`, `c`

Crop the image to the given size and offset.

The width, height, and x and y offsets are absolute **pixel** values based on the original image.

```
http://<host>/<client>[:<signature>]/crop:<width>,<height>,<x>,<y>/<image_url>

http://<host>/<client>[:<signature>]/crop:300,500,30,30/<image_url>
```

|Argument||
|:---|:---|
|`width`|The width for the crop (in pixels).|
|`height`|The height for the crop (in pixels).|
|`x`|The horizontal offset for the crop from the left of the image (in pixels).|
|`y`|The vertical offset for the crop from the top of the image (in pixels).|

- - -

#### `flip`, `p`

Flip the image along the given direction (`h` for horizontal or `v` for vertical).

```
http://<host>/<client>[:<signature>]/flip:<direction>/<image_url>

http://<host>/<client>[:<signature>]/flip:v/<image_url>
http://<host>/<client>[:<signature>]/p:h/<image_url>
```

|Argument||
|:---|:---|
|`direction`|The direction to perform the flip (`h` for horizontal or `v` for vertical).|

- - -

#### `focal`, `foc`

Set the focal point for the image based on detection algorithms.

Specifying `auto` will use a predefined detection list. The first detection to match will be used as the focal point.  
The list can contain `face`, `eye`, `eyeglasses`, etc. See below for the full list

If the detection returns more than one match, the center of mass of all matches will be calculated and used as the center point.

```
http://<host>/<client>[:<signature>]/focal:<detection_list>/<image_url>

http://<host>/<client>[:<signature>]/focal:auto/<image_url>
http://<host>/<client>[:<signature>]/foc:face,car_side,eye/<image_url>
```

|Argument||
|:---|:---|
|`detection_list`|A comma-delimited list of detection algorithms to check. Uses the first one that matches.|

`face`, `eye`, `eyeglasses`, `full_body`, `car_side`, `interesting_points`.

##### Supported Detection Algorithms

|Detections||
|:---|:---|
|`face`|Looks for frontal facial match(es).|
|`eye`|Looks for eye match(es).|
|`eyeglasses`|Looks for eyeglass match(es).|
|`full_body`|Looks for full body match(es).|
|`car_side`|Looks for car (automobile) side match(es).|
|`interesting_points`|Looks for interesting points with good contrast.|

- - -

#### `rotate`, `o`

Rotate the image to the given angle.

```
http://<host>/<client>[:<signature>]/rotate:<degrees>[,<background>]/<image_url>

http://<host>/<client>[:<signature>]/rotate:60/<image_url>
http://<host>/<client>[:<signature>]/o:45,ccc/<image_url>
```

|Argument||
|:---|:---|
|`degrees`|The angle to use for the image rotation in degrees (`0` to `360`).|
|`background`|The background color to use for empty space (if any). This should be a hex color, such as `f00` (red) or `00ff00` (green).|

- - -

#### `format`, `f`

Set the output format for the image.

```
http://<host>/<client>[:<signature>]/format:<image_format>/<image_url>

http://<host>/<client>[:<signature>]/f:jpg/<image_url>
http://<host>/<client>[:<signature>]/f:png/<image_url>
```

|Argument||
|:---|:---|
|`image_format`|The format for the image image (see below for all supported formats).|

##### Supported Image Formats

|Format||
|:---|:---|
|`jpg`|Joint Photographic Experts Group JFIF format (JPEG)|
|`png`|Portable Network Graphics (PNG)|
|`gif`|CompuServe Graphics Interchange Format (GIF)|
|`bmp`|Microsoft Windows Bitmap|
|`tiff`|Tagged Image File Format|

- - -

#### `quality`, `q`

Set the quality for the image being output. Lower quality images reduce download size.

Quality can only be set if the image **format** is one of `jpg`, `png`, or `tiff`.

```
http://<host>/<client>[:<signature>]/quality:<percent>/<image_url>

http://<host>/<client>[:<signature>]/quality:35/<image_url>
http://<host>/<client>[:<signature>]/q:85/<image_url>
```

|Argument||
|:---|:---|
|`percent`|The quality percent (`0` to `100`).|
