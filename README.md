# Pool Controller Project

A complete ESPHome-based pool automation platform that integrates custom hardware components, management tools, and a modern web dashboard for controlling and monitoring pool equipment.
 
I've also posted about the controller in the HomeAssistant community forums. you can find tbat post here: [ESPHome Pool Controller: Integration for Pentair IntelliFlo pumps, IntelliChlor chlorinators, IntelliBrite Lights, and other pool features](https://community.home-assistant.io/t/esphome-pool-controller-integration-for-pentair-intelliflo-pumps-intellichlor-chlorinators-intellibrite-lights-and-other-pool-features/974565)

## Overview

This project provides an end-to-end solution for pool automation:

- **Custom ESPHome Components** communicate directly with pool hardware (Pentair pumps and chlorinators) and extend ESPHome's capabilities with custom web endpoints
- **ESPHome Configuration** provides complete firmware setup for the Waveshare ESP32-S3 relay module, including modular YAML files for all pool equipment
- **Management Tools** help with device setup, diagnostics, and REST API integration
- **Web Dashboard** provides a modern, responsive interface for monitoring and controlling your pool system from any browser

These components work together seamlessly: ESPHome firmware runs on your ESP32/ESP8266, exposing sensors and controls to both Home Assistant and the web dashboard. The tools help bridge setup and integration tasks.

## Components

See [components/README.md](components/README.md) for details about the available ESPHome components:

- **custom_web_handler**: Add custom web endpoints to your ESPHome device, supporting multiple endpoint types and integration with the built-in web_server.
- **pentair_if_ic**: Control Pentair IntelliFlo pumps and IntelliChlor chlorinators over RS485, with full Home Assistant sensor support and bus arbitration.

## ESPHome Configuration

See [esphome/README.md](esphome/README.md) for the complete firmware configuration:

- **Hardware Platform**: Built for the Waveshare ESP32-S3-RELAY-6CH industrial module with 6 relay channels, built-in isolated RS485, and wide voltage input (7-36V DC)
- **Modular YAML Configuration**: Main configuration file with separate includes for temperature sensors, pump scheduling, chlorinator control, and pool light modes
- **Integrated Control**: Manages waterfall pump, Pentair IntelliBrite light (14 color modes via power cycling), RS485 communication with pump/chlorinator, and Dallas temperature sensors
- **Complete Wiring Documentation**: Detailed diagrams showing all GPIO assignments and component connections

## Tools

See [Tools/README.md](Tools/README.md) for details about the available utilities:

- **get_ids.py**: Retrieve ESPHome device information, list entities, generate REST API endpoints, and test connectivity. Supports encrypted connections and live endpoint testing.

## Web Dashboard

See [web-dashboard/README.md](web-dashboard/README.md) for installation and usage:

- **Web Dashboard**: A modern, responsive web interface for your ESPHome pool automation system. Features real-time monitoring, pool light controls, pump configuration, chlorinator management, schedule overview, and mobile-optimized layout. Includes a complete TypeScript REST API client with type definitions for all 103 entities.

---

For setup and usage instructions, refer to the individual component, configuration, tool, and dashboard READMEs linked above.
