# Pointr

A simple image service using Node.js, Express, GraphicsMagick, and OpenCV.

## Installation

1. Install Node.js
2. Install GraphicsMagick
3. Install OpenCV
4. `npm install`

## Options

|Environment Variable||
|:---|:---|
|`POINTR_PORT`|Defaults to `3000`. The port to run the service on.|
|`POINTR_SHARED_KEYS`|A **space-delimited** list of shared secret keys to prevent spamming of service.|
|`POINTR_ALLOW_UNSAFE`|Defaults to `0` (false). Whether to allow unsafe requests (those without a key).|