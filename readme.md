# Pointr

A simple image service using Node.js, Express, GraphicsMagick, and OpenCV.

## Installation

1. Install Node.js
2. Install GraphicsMagick
3. Install OpenCV
4. `npm install`

## Running

`node index.js`

### Options

|Environment Variable||
|:---|:---|
|`POINTR_PORT`|Defaults to `3000`. The port to run the service on.|
|`POINTR_SHARED_KEYS`|A **space-delimited** list of shared secret keys to prevent spamming of service.|
|`POINTR_ALLOW_UNSAFE`|Defaults to `0` (false). Whether to allow unsafe requests (those without a key).|
|`POINTR_INSTANCES`|Defaults to either CPU core count or 16, whichever is higher. The number of Pointr processing instances to start.|

## API

The Pointr API takes a **security signature**, followed by a sequence of **operations**, followed by the **image URL** to manipulate.

The format looks like the following:

`http://<pointr_service_host>/<signature>/<operation1>/<operation2>/.../<image_url>`

### Operations

Operations contain a **name**, followed by a colon `:`, followed by a comma-delimited list of **parameters**.

The format looks like the following:

`<operation_name>:<param1>,<param2>,...`

|Name|Short&nbsp;Name|Parameters|Description|
|:---|:---|:---|:---|
|`crop`|`c`|`width,height,x,y`|Crop the image to the given size, offset.| 
|`flip`|`p`|`direction`|Flip the image along the given direction (`h` for horizontal or `v` for vertical).|
|`focal`|`f`|`auto|<detection_list>`|Set the focal point for the image based on detection algorithms. The list can contain `face`, `eye`, `eyeglasses`, `full_body`, `car_site`, `interesting_points`.|
|`thumb`|`t`|`width,height`|Create a thumbnail for the given size (takes the focal point into consideration).|
|`resize`|`r`|`width,height,option`|Resize the image to the given size.|
|`rotate`|`o`|`degrees[,background]`|Rotate the image the given degrees. Can optionally provide a background color.|
