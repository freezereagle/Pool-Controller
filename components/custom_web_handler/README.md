# Custom Web Handler Component

A custom ESPHome component that allows you to add custom web endpoints to your device alongside the standard web_server component.

## Features

- **Multiple endpoint types**: Text, embedded files, and URL proxying (ESP32 Arduino only)
- **Works with web_server**: Compatible with ESPHome's built-in web_server component
- **Flash storage**: Files are embedded in firmware using PROGMEM
- **Framework support**: ESP32 (ESP-IDF and Arduino), ESP8266

## Installation

Add as an external component in your ESPHome configuration:

```yaml
external_components:
  - source:
      type: local
      path: components
    components: [custom_web_handler]
```

## Configuration

```yaml
custom_web_handler:
  endpoints:
    - path: "/hello"
      content_type: "text/plain"
      text: "Hello from ESPHome!"
    
    - path: "/custom_page"
      content_type: "text/html"
      file: custom_page.html
    
    - path: "/api/info"
      content_type: "application/json"
      text: '{"device":"pool-controller","version":"1.0"}'
```

## Endpoint Types

### Text Endpoint

Returns static text content:

```yaml
- path: "/hello"
  content_type: "text/plain"
  text: "Hello World!"
```

### File Endpoint

Embeds a file in firmware and serves it:

```yaml
- path: "/custom_page"
  content_type: "text/html"
  file: custom_page.html
```

The file path is relative to your ESPHome configuration directory. Files are embedded in flash memory at compile time.

### URL Endpoint (ESP32 Arduino only)

Proxies requests to another URL:

```yaml
- path: "/proxy"
  content_type: "text/html"
  url: "http://example.com/data"
```

**Note**: URL endpoints only work on ESP32 with Arduino framework. ESP-IDF and ESP8266 will return a 501 error.

## Complete Example

```yaml
esphome:
  name: my-device
  
esp32:
  variant: esp32
  framework:
    type: esp-idf

# Required for custom_web_handler
web_server:
  port: 80
  version: 3

external_components:
  - source:
      type: local
      path: components
    components: [custom_web_handler]

custom_web_handler:
  endpoints:
    # Simple text response
    - path: "/hello"
      content_type: "text/plain"
      text: "Hello from ESPHome!"
    
    # HTML page from file
    - path: "/custom_page"
      content_type: "text/html"
      file: custom_page.html
    
    # JSON API endpoint
    - path: "/api/status"
      content_type: "application/json"
      text: '{"status":"online","uptime":12345}'
    
    # CSS file
    - path: "/styles.css"
      content_type: "text/css"
      file: styles.css
    
    # JavaScript file
    - path: "/script.js"
      content_type: "application/javascript"
      file: script.js
```

## Example HTML File

Create `custom_page.html` in your ESPHome config directory:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Custom Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f0f0f0;
        }
        .container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Custom ESPHome Page</h1>
        <p>This page is served from embedded firmware!</p>
        <a href="/">Back to main interface</a>
    </div>
</body>
</html>
```

## Usage

After flashing your device, access custom endpoints:

- `http://your-device.local/hello` - Text response
- `http://your-device.local/custom_page` - HTML page
- `http://your-device.local/api/status` - JSON data

The standard web_server interface remains at `http://your-device.local/`

## Content Types

Common content types:

- `text/html` - HTML pages
- `text/plain` - Plain text
- `text/css` - CSS stylesheets
- `application/javascript` - JavaScript files
- `application/json` - JSON data
- `image/png` - PNG images
- `image/jpeg` - JPEG images
- `image/svg+xml` - SVG images

## Memory Considerations

Files are embedded in flash memory (PROGMEM). Keep file sizes reasonable:

- Small HTML/CSS/JS files: < 10KB recommended
- Images: Consider using external hosting or data URIs
- Total flash space: Check your ESP32/ESP8266 partition size

## Framework Compatibility

| Feature | ESP32 (ESP-IDF) | ESP32 (Arduino) | ESP8266 |
|---------|-----------------|-----------------|---------|
| Text endpoints | ✅ | ✅ | ✅ |
| File endpoints | ✅ | ✅ | ✅ |
| URL endpoints | ❌ | ✅ | ❌ |

## Troubleshooting

### Endpoint not found (404)

- Verify the `path` starts with `/`
- Check that web_server component is enabled
- Ensure device has compiled and rebooted

### File not embedding

- Check file path is relative to ESPHome config directory
- Verify file exists at compile time
- Check compilation logs for errors

### URL endpoint returns 501

- URL endpoints only work on ESP32 Arduino framework
- ESP-IDF and ESP8266 don't support HTTPClient library
- Consider using direct text/file endpoints instead

## License

This component is provided as-is for use with ESPHome.
