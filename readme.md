# Pointr

A simple image service using Node.js, Express, GraphicsMagick, and OpenCV.

## Installation

1. Install Node.js
2. Install GraphicsMagick
3. Install OpenCV
4. `npm install`
5. Create a `config.yml` based on the example

## Running

`node index.js production_config.yml`

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


## API

The Pointr API takes a **security signature**, followed by a sequence of **operations**, followed by the **image URL** to manipulate.

The format looks like the following:

`http://<pointr_service_host>/<signature>/<operation1>/<operation2>/.../<image_url>`

### Operations

Operations contain a **name**, followed by a colon `:`, followed by a comma-delimited list of **parameters**.

The format looks like the following:

`<operation_name>:<param1>,<param2>,...`

#### `crop` (`c`)

Crop the image to the given size, offset.

```
http://<pointr_service>/crop:<width>,<height>,<x>,<y>/<image_url>

http://<pointr_service>/crop:300,500,30,30/<image_url>
```

#### `flip` (`p`)

Flip the image along the given direction (`h` for horizontal or `v` for vertical).

```
http://<pointr_service>/flip:<direction>/<image_url>

http://<pointr_service>/flip:v/<image_url>
http://<pointr_service>/p:h/<image_url>
```

#### `focal` (`f`)

Set the focal point for the image based on detection algorithms. The list can contain `face`, `eye`, `eyeglasses`, `full_body`, `car_side`, `interesting_points`.

```
http://<pointr_service>/focal:<detection_list>/<image_url>

http://<pointr_service>/focal:auto/<image_url>
http://<pointr_service>/f:face,car_side,eye/<image_url>
```

#### `thumb` (`t`)

Create a thumbnail for the given size (takes the focal point into consideration).

```
http://<pointr_service>/thumb:<width>,<height>/<image_url>

http://<pointr_service>/thumb:500,300/<image_url>
http://<pointr_service>/t:600,250/<image_url>
```

#### `resize` (`r`)

Resize the image to the given size.

```
http://<pointr_service>/resize:<width>,<height>[,<option>]/<image_url>

http://<pointr_service>/resize:500,300/<image_url>
http://<pointr_service>/r:600,250,!/<image_url>
```

#### `rotate` (`o`)

Resize the image to the given size.

```
http://<pointr_service>/rotate:<degrees>[,<background>]/<image_url>

http://<pointr_service>/rotate:60/<image_url>
http://<pointr_service>/o:45,ccc/<image_url>
```
