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
|`validHostnames`|Optional. A list of valid host names the service will respond to.|
|`instances.min`|Optional. Defaults to `16`. The minimum number of instances to start.|
|`instances.max`|Optional. Defaults to `128`. The maximum number of instances to start.|
|`ipHeader`|Recommended. The header to use for the end-client (browser) IP address.|
|`rateLimiter`|Recommended. A rate limiter to use. See `config.example.yml` for an example.|
|`clients`|Required. The set of clients that will be using the service. See `config.example.yml` for an example.|

#### Example Configuration

```yml
# Optional. Defaults to 3000. The port for the service to run on.
port: 3000

# Optional. A list of valid hostnames for the service.
# This is useful if you want to hide the origin hostname (e.g. s3cr3th0s1.example.com).
validHostnames:
  - localhost

# Optional. The number of pointr instances to run.
# This will default to the number of CPUs on the system bounded by the min and max.
instances:
  min: 16
  max: 64

# Recommended. The header to use for the end-client (browser) IP address.
# This is necessary if this service is an origin,
# fronted by a CDN that provides its own header for the client IP address.
# For example, Akamai provides a "True-Client-IP" header.
ipHeader: True-Client-IP

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

`http://<pointr_service_host>/<client>[:<signature>]/<operation1>/<operation2>/.../<image_url>`

### Operations

Operations contain a **name**, followed by a colon `:`, followed by a comma-delimited list of **parameters**.

The format looks like the following:

`<operation_name>:<param1>,<param2>,...`

#### resize (r)

Resize the image to the given size.

```
http://<host>/<client:signature>/resize:<width>,<height>[,<options>]/<image_url>

http://<host>/<client:signature>/resize:500,300/<image_url>
http://<host>/<client:signature>/r:600,250,force/<image_url>
```

|Argument||
|:---|:---|
|`width`|The width.|
|`height`|The height.|
|`kind`|The kind of resize to perform (see below).|

|Options||
|:---|:---|
|`force`|Force the resize to the width and height specified.|
|`shrink`|Only resize the image if it will shrink.|
|`grow`|Only resize the image if it will grow.|
|`min`|Treat the width/height as **minimum** values instead of maximum values.|
|`percent`|Treat the width/height as percentages.|

#### thumb (t)

Create a thumbnail for the given size (takes the focal point into consideration).

```
http://<host>/<client:signature>/<client:signature>/thumb:<width>,<height>/<image_url>

http://<host>/<client:signature>/<client:signature>/thumb:500,300/<image_url>
http://<host>/<client:signature>/<client:signature>/t:600,250/<image_url>
```

#### crop (c)

Crop the image to the given size, offset.

```
http://<host>/<client:signature>/crop:<width>,<height>,<x>,<y>/<image_url>

http://<host>/<client:signature>/crop:300,500,30,30/<image_url>
```

#### flip (p)

Flip the image along the given direction (`h` for horizontal or `v` for vertical).

```
http://<host>/<client:signature>/flip:<direction>/<image_url>

http://<host>/<client:signature>/flip:v/<image_url>
http://<host>/<client:signature>/p:h/<image_url>
```

#### focal (foc)

Set the focal point for the image based on detection algorithms. The list can contain `face`, `eye`, `eyeglasses`, `full_body`, `car_side`, `interesting_points`.

```
http://<host>/<client:signature>/focal:<detection_list>/<image_url>

http://<host>/<client:signature>/focal:auto/<image_url>
http://<host>/<client:signature>/f:face,car_side,eye/<image_url>
```

#### rotate (o)

Resize the image to the given angle.

```
http://<host>/<client:signature>/rotate:<degrees>[,<background>]/<image_url>

http://<host>/<client:signature>/rotate:60/<image_url>
http://<host>/<client:signature>/o:45,ccc/<image_url>
```

#### format (f)

Set the output format for the image.

```
http://<host>/<client:signature>/format:<image_format>/<image_url>

http://<host>/<client:signature>/f:jpg/<image_url>
http://<host>/<client:signature>/f:png/<image_url>
```

##### Supported Image Formats

|Format||
|:---|:---|
|`jpg`|Joint Photographic Experts Group JFIF format (JPEG)|
|`png`|Portable Network Graphics (PNG)|
|`gif`|CompuServe Graphics Interchange Format (GIF)|
|`bmp`|Microsoft Windows Bitmap|

#### quality (q)

Set the quality for the image being output. Lower quality images reduce download size.

```
http://<host>/<client:signature>/quality:<percent>/<image_url>

http://<host>/<client:signature>/quality:35/<image_url>
http://<host>/<client:signature>/q:85/<image_url>
```