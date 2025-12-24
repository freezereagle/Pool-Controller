# ESPHome Components

This folder contains custom ESPHome components for pool automation. See below for a summary of each component:

## [custom_web_handler](custom_web_handler/README.md)
A custom ESPHome component that allows you to add custom web endpoints to your device alongside the standard web_server component.
- Multiple endpoint types: text, embedded files, and URL proxying (ESP32 Arduino only)
- Works with ESPHome's built-in web_server
- Flash storage for embedded files
- Supports ESP32 (ESP-IDF/Arduino) and ESP8266

## [pentair_if_ic](pentair_if_ic/README.md)
ESPHome component for controlling Pentair IntelliFlo variable speed pumps and IntelliChlor salt water chlorinators over RS485.
- Unified communication for both pump and chlorinator on a shared RS485 bus
- Automatic polling and bus arbitration
- Exposes all pump and chlorinator sensors to Home Assistant
- Requires ESP32/ESP8266 and RS485 to TTL converter
