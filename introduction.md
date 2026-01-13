# ESPHome Pool Controller: Integration for Pentair IntelliFlo pumps, IntelliChlor chlorinators, IntelliBrite Lights, and other pool features

**GitHub Repository:** The complete project with in-depth documentation is available at: [https://github.com/freezereagle/Pool-Controller](https://github.com/freezereagle/Pool-Controller)

I'm excited to share a project I've been working on: a comprehensive, open-source pool automation system built on ESPHome that gives me full local control over my Pentair pool equipment.

My goal was to create a robust, "set-it-and-forget-it" solution for controlling pool equipment—specifically Pentair IntelliFlo pumps, IntelliChlor chlorinators, IntelliBrite pool lights, and waterfalls—without relying on expensive, proprietary automation panels like Pentair's ScreenLogic or IntelliCenter systems.

**A huge thank you to @berniedp for the inspiration!** This project wouldn't exist without his excellent write-up and research. You can check out his original post here: [New Pentair Pool Automation Setup - Full Write-up](https://community.home-assistant.io/t/new-pentair-pool-automation-setup-full-write-up/929658).

---

## Overview

My **Pool Controller** project is an end-to-end solution that combines carefully selected industrial hardware, specialized custom ESPHome components, and a modern web dashboard.

It's designed to give you full local control over your pool equipment, exposing every possible sensor and configuration option to Home Assistant while also providing a standalone, responsive web interface for family members or quick adjustments from poolside.

### Key Features at a Glance

*   **Unified RS485 Control:** Controls both Pentair pump and chlorinator on a single bus with automatic collision avoidance
*   **Industrial-Grade Hardware:** Built around the Waveshare ESP32-S3-RELAY-6CH for reliability and longevity
*   **Modern Web Dashboard:** A dedicated, mobile-friendly web app hosted directly on the device for easy control
*   **Home Assistant Native:** Seamless integration via the ESPHome API with full sensor exposure
*   **Complete Pool Control:** Manage pump scheduling, variable speeds, chlorination levels, IntelliBrite pool lights, waterfall valve, and temperature monitoring
*   **Smart Scheduling:** Automated time-based control of pump speeds and waterfall operation

---

## The Hardware

I chose the **Waveshare ESP32-S3-RELAY-6CH** board for this project, and it's been rock-solid:

*   **Industrial Robustness:** Uses an industrial-grade ESP32-S3 module designed for harsh environments
*   **Built-in Isolated RS485:** Features onboard isolated RS485 with automatic direction control and TVS diode protection—no external converters needed!
*   **Wide Voltage Input:** Accepts 7-36V DC, making it easy to power from existing pool panel supplies
*   **6 Relay Channels:** Each rated for 10A at 250VAC, perfect for controlling lights, valves, and auxiliary pumps
*   **Expansion Ready:** Currently using 2 of 6 relays, leaving plenty of room for heaters, spa pumps, or additional valves

**What I'm Controlling:**
*   **Relay CH1 (GPIO1):** Waterfall valve (24V AC)
*   **Relay CH6 (GPIO46):** Pentair IntelliBrite pool light (12V AC)
*   **Built-in RS485 (GPIO17/18):** Pentair IntelliFlo pump and IntelliChlor chlorinator
*   **1-Wire Bus (GPIO10):** Dallas DS18B20 temperature sensors for air and water temperature

**Note:** All GPIO pin assignments are fully configurable in the YAML configuration to match your specific hardware setup.

---

## The Software: Custom ESPHome Components

The heart of my project consists of two custom ESPHome components that work together seamlessly:

### [pentair_if_ic - Pentair IntelliFlo + IntelliChlor Component](https://github.com/freezereagle/Pool-Controller/blob/main/components/pentair_if_ic)

This is the main driver that talks to both the IntelliFlo pump and IntelliChlor chlorinator over RS485.

Existing solutions often struggled when trying to communicate with both devices on the same RS485 wire because both are "chatty" and would talk over each other, causing packet collisions and checksum errors.

**My Solution:**
*   **Intelligent Bus Arbitration:** The component manages RS485 bus traffic with separate queues for pump and chlorinator commands, ensuring devices take turns communicating
*   **Collision Prevention:** Enforces 150ms minimum gaps between transmissions and 100ms quiet time before transmitting
*   **Unified Driver:** A single component handles both Pentair protocols, consolidating logic and reducing overhead
*   **Full Sensor Suite:** Exposes data that standard integrations miss, including:
    *   **Pump:** RPM, Flow Rate (GPM), Power Consumption (Watts), Pressure (PSI), Program Timer, and Clock
    *   **Chlorinator:** Salt Level (PPM), Water Temperature, Status Codes, Error Codes, Output Percentage, and multiple alarm states (no flow, low/high salt, clean cell, high current, low voltage, low temperature)

**Control Capabilities:**
*   Start/stop pump with specific RPM or flow rate targets
*   Run local or external programs (1-4)
*   Save custom RPM values to program slots
*   Adjust chlorinator output percentage (0-100%)
*   Enable/disable takeover mode for chlorinator control

### [custom_web_handler - Web Dashboard Foundation](https://github.com/freezereagle/Pool-Controller/blob/main/components/custom_web_handler)

This component is what makes the web dashboard possible. It extends ESPHome's built-in `web_server` component by allowing me to add custom HTTP endpoints.

**Key Features:**
*   **Multiple Endpoint Types:** Serve static text, embedded files (HTML/CSS/JS), or proxy URLs
*   **Flash Storage:** Files are embedded directly in the firmware using PROGMEM
*   **Framework Compatibility:** Works with ESP32 (ESP-IDF and Arduino) and ESP8266
*   **Seamless Integration:** Works alongside the standard ESPHome web interface

In my configuration, I use it to serve a complete single-page web application at `/custom_page` that provides a beautiful, responsive interface for controlling all pool functions.

---

## [Temperature Monitoring](https://github.com/freezereagle/Pool-Controller/blob/main/esphome/Include/temperature.yaml)

I'm using Dallas DS18B20 temperature sensors on a 1-Wire bus to monitor both air and water temperature:

*   **Air Temperature Sensor:** Mounted in the equipment area to track ambient conditions
*   **Water Temperature Sensor:** Installed in the plumbing to monitor actual pool water temperature
*   **Fahrenheit Conversion:** Template sensors provide readings in °F for easy viewing
*   **120-Second Updates:** Balances responsiveness with sensor longevity

These readings are used both for monitoring and for automation—for example, adjusting chlorinator output based on water temperature.

---

## [Pentair IntelliBrite Light Control](https://github.com/freezereagle/Pool-Controller/blob/main/esphome/Include/pentair_light.yaml)

One of my favorite features is the IntelliBrite pool light control. These lights don't use traditional color commands—instead, you cycle through 14 different color modes by power cycling the light.

**My Implementation:**
*   **14 Color/Mode Selections:** Party, Romance, Caribbean, American, Sunset, Royalty, Blue, Green, Red, White, Magenta, Hold, and Recall
*   **Smart Mode Tracking:** The system remembers the current mode and calculates the shortest path to the desired mode
*   **Power Cycle Logic:** Automatically cycles the relay the correct number of times to reach the selected color
*   **Persistent State:** Mode selection survives reboots
*   **Home Assistant Integration:** Exposed as a `select` entity for easy control

The relay (CH6) switches the 12V AC power to the light, and the cycling logic handles the rest automatically.

---

## [Waterfall Control](https://github.com/freezereagle/Pool-Controller/blob/main/esphome/Include/schedule.yaml)

My pool has a waterfall feature controlled by a 24V AC valve. I'm using Relay CH1 to switch this valve on and off.

**Integration with Scheduling:**
*   The waterfall can be scheduled to run during specific time periods
*   Each of the 5 configurable schedule periods can independently enable/disable the waterfall
*   Manual override is available through Home Assistant or the web dashboard
*   Automation ensures the waterfall only runs when the pump is operating

---

## Automated Scheduling System

The scheduling system is one of the most complex parts of my configuration, but it's what makes the system truly "set-it-and-forget-it."

**Scheduling Features:**
*   **5 Configurable Time Periods:** Each period has:
    *   Start time (hour and minute)
    *   Pump speed selection (5 preset speeds: Speed 1-5, each with configurable RPM)
    *   Waterfall enable/disable toggle
*   **Flexible Speed Configuration:** Each of the 5 speed presets can be set to any RPM value (up to 3450 RPM)
*   **Automation Enable/Disable:** Global switch to enable/disable automated scheduling
*   **State Management:** Extensive logic tracks the current schedule period and manages transitions
*   **Manual Override:** Can manually control pump speed and waterfall at any time

**Example Use Case:**
*   **Period 1 (6:00 AM):** Speed 1 (1450 RPM) - Low speed circulation, waterfall OFF
*   **Period 2 (10:00 AM):** Speed 2 (2350 RPM) - Medium speed for cleaning, waterfall ON
*   **Period 3 (2:00 PM):** Speed 1 (1450 RPM) - Back to low speed, waterfall OFF
*   **Period 4 (6:00 PM):** Speed 3 (3110 RPM) - High speed for evening swim, waterfall ON
*   **Period 5 (9:00 PM):** Pump OFF - End of daily cycle

This scheduling runs entirely on the ESP32, so it continues working even if Home Assistant is offline.

---

## [The Web Dashboard](https://github.com/freezereagle/Pool-Controller/tree/main/web-dashboard)

While Home Assistant is perfect for automation and advanced control, sometimes you just want a quick, clean interface to check the salt level or turn on the waterfall from your phone while standing by the pool.

My project includes a **Modern Web Dashboard** that's hosted directly on the ESP32:

*   **Responsive Design:** Looks great on mobile and desktop browsers
*   **Real-time Updates:** Uses the custom web handler and ESPHome's REST API for live status updates
*   **Comprehensive Control:** 
    *   Change pump speeds with preset buttons
    *   Set IntelliBrite light color modes (all 14 modes)
    *   Adjust chlorinator output percentage
    *   Toggle waterfall on/off
    *   View schedule overview
    *   Monitor all sensors (temperature, salt level, power consumption, etc.)
*   **Mobile-Optimized Layout:** Designed for quick access from poolside
*   **TypeScript REST API Client:** Includes complete type definitions for all 86 entities

The dashboard is served at `http://pool-controller.local/custom_page` and requires no external hosting—everything runs locally on the device.

---

## [Management Tools](https://github.com/freezereagle/Pool-Controller/tree/main/Tools)

I've also included Python utilities to help with setup and integration:

**`get_ids.py`** - Device Information and API Helper:
*   Retrieve ESPHome device information
*   List all entities with their IDs and types
*   Generate REST API endpoint URLs
*   Test connectivity and encryption
*   Live endpoint testing for debugging

---

## Getting Started

My project is structured to be modular—you can use just the custom components with your own configuration, or adopt my complete firmware setup.

**Repository Structure:**
*   `/components`: The custom C++ components for ESPHome
    *   `pentair_if_ic` - Pentair pump and chlorinator driver
    *   `custom_web_handler` - Custom web endpoint handler
*   `/esphome`: Complete YAML configuration for the Waveshare board
    *   Modular includes for temperature, scheduling, chlorinator, and light control
    *   Detailed wiring diagrams and pin assignments
*   `/web-dashboard`: Source code for the TypeScript/React frontend interface
*   `/Tools`: Python utilities for device management and API integration

**Quick Start:**
1. Update `secrets.yaml` with your WiFi credentials and sensor addresses
2. Modify pin assignments in `pool-controller.yaml` if using different hardware
3. Compile and upload using ESPHome CLI or Home Assistant ESPHome integration
4. Access the standard ESPHome interface at `http://pool-controller.local`
5. View the custom dashboard at `http://pool-controller.local/custom_page`

Check out the detailed READMEs in each directory for wiring diagrams, installation instructions, and configuration examples.

---

*This project is a work of passion to make pool automation accessible, reliable, and fully local. Feel free to ask questions, suggest improvements, or contribute on GitHub!*
