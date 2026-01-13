# Pentair IntelliFlo + IntelliChlor Component

ESPHome component for controlling Pentair IntelliFlo variable speed pumps and IntelliChlor salt water chlorinators over RS485.
This component is a combination of two other components:
1. [Nicostrown's Pentair Intelliflo Component](https://github.com/nicostrown/ESPHome-Pentair-Intelliflo) with a fix to the RPM setting protocal and adding mor information from the staus request.
2. [Wolfson292's Pentair Intellichlor component](https://github.com/wolfson292/intellichlor)

The major change is they both use the same in and out buffers, so the pump and clorinator can communicate on a common RS485 bus.

## Features

- **Unified Communication**: Single component manages both IntelliFlo pump and IntelliChlor chlorinator on shared RS485 bus
- **Automatic Polling**: Configurable polling intervals (default 30s)
- **Bus Arbitration**: Prevents transmission collisions between protocols
- **Full Sensor Support**: Exposes all known pump and chlorinator sensors to Home Assistant
- **Manual Refresh**: On-demand chlorinator status updates via button/automation

## Hardware Requirements

- ESP32 or ESP8266
- RS485 to TTL converter (e.g., MAX485) if not part of your board
- Pentair IntelliFlo pump
- Pentair IntelliChlor chlorinator
- Optional: Flow control pin for half-duplex RS485

## Installation

Add to your ESPHome configuration:

```yaml
external_components:
  - source: components/Pool_Automation/components
    components: [pentair_if_ic]
    refresh: 0s

uart:
  - id: uart_bus
    tx_pin: GPIO17
    rx_pin: GPIO16
    baud_rate: 9600

pentair_if_ic:
  id: my_pentair
  uart_id: uart_bus
  update_interval: 30s
  # Optional: flow_control_pin for RS485 direction control
  # flow_control_pin: GPIO4
```

## Configuration Variables

### Platform Configuration

- **id** (*Required*, ID): Unique ID for the component instance
- **uart_id** (*Required*, ID): ID of the UART bus
- **update_interval** (*Optional*, Time): Polling interval (default: 30s)
- **flow_control_pin** (*Optional*, Pin): GPIO pin for RS485 direction control

### IntelliFlo Pump Sensors

```yaml
sensor:
  - platform: pentair_if_ic
    power:
      name: "Pump Power"
      id: pump_power
      unit_of_measurement: "W"
    rpm:
      name: "Pump RPM"
      id: pump_rpm
      unit_of_measurement: "RPM"
    flow:
      name: "Pump Flow Rate"
      id: pump_flow
      unit_of_measurement: "GPM"
    pressure:
      name: "Pump Pressure"
      id: pump_pressure
      unit_of_measurement: "PSI"
    time_remaining:
      name: "Program Time Remaining"
      id: time_remaining
      unit_of_measurement: "min"
    clock:
      name: "Pump Clock"
      id: pump_clock
      unit_of_measurement: "min"

binary_sensor:
  - platform: pentair_if_ic
    running:
      name: "Pump Running"
      id: pump_running

text_sensor:
  - platform: pentair_if_ic
    program:
      name: "Active Program"
      id: active_program
```

### IntelliChlor Sensors

```yaml
sensor:
  - platform: pentair_if_ic
    salt_ppm:
      name: "Salt Level"
      id: salt_ppm
      unit_of_measurement: "PPM"
    water_temp:
      name: "Water Temperature"
      id: water_temp
      unit_of_measurement: "°F"
    status:
      name: "Chlorinator Status"
      id: chlorinator_status
    error:
      name: "Chlorinator Error"
      id: chlorinator_error
    set_percent:
      name: "Chlorinator Output %"
      id: chlorinator_set_percent
      unit_of_measurement: "%"

binary_sensor:
  - platform: pentair_if_ic
    no_flow:
      name: "No Flow Alarm"
    low_salt:
      name: "Low Salt Alarm"
    high_salt:
      name: "High Salt Alarm"
    clean:
      name: "Clean Cell Required"
    high_current:
      name: "High Current Alarm"
    low_volts:
      name: "Low Voltage Alarm"
    low_temp:
      name: "Low Temperature Alarm"
    check_pcb:
      name: "Check PCB"

text_sensor:
  - platform: pentair_if_ic
    version:
      name: "Chlorinator Version"
      id: chlorinator_version

number:
  - platform: pentair_if_ic
    swg_percent:
      name: "Chlorine Output"
      id: swg_percent_number
      min_value: 0
      max_value: 100
      step: 1

switch:
  - platform: pentair_if_ic
    takeover_mode:
      name: "Takeover Mode"
      id: takeover_mode_switch
```

## Available Functions

Call these functions from Lambda actions or automations:

### Pump Control Functions

```cpp
// Request current pump status
id(my_pentair).requestPumpStatus();

// Start/stop pump
id(my_pentair).run();
id(my_pentair).stop();

// Set pump to specific RPM
id(my_pentair).commandRPM(1450);  // RPM value

// Set pump to specific flow rate
id(my_pentair).commandFlow(45);  // Flow in GPM * 10

// Run local program (1-4)
id(my_pentair).commandLocalProgram(0);  // Program 1
id(my_pentair).commandLocalProgram(1);  // Program 2

// Run external program (1-4)
id(my_pentair).commandExternalProgram(0);  // External Program 1

// Save RPM value to program slot
id(my_pentair).saveValueForProgram(0, 1450);  // Program 1, 1450 RPM

// Control modes
id(my_pentair).pumpToLocalControl();
id(my_pentair).pumpToRemoteControl();

// Set pump clock (NOTE: Not supported on most IntelliFlo models)
// Most pumps return error 0xFF 0x19 - clock is read-only
// Clock must be set via pump's physical keypad on most models
id(my_pentair).setPumpClock(14, 30);  // Set to 14:30 (2:30 PM)
```

### Chlorinator Control Functions

```cpp
// Refresh chlorinator status (bypasses rate limiting)
id(my_pentair).refresh_chlorinator();

// Standard refresh (respects 25s rate limit)
id(my_pentair).read_all_chlorinator_info();

// Legacy alias
id(my_pentair).read_all_info();
```

## Example Configurations

### Complete Pool Controller

```yaml
external_components:
  - source: components/Pool_Automation/components
    components: [pentair_if_ic]
    refresh: 0s

uart:
  - id: uart_bus
    tx_pin: GPIO17
    rx_pin: GPIO16
    baud_rate: 9600

pentair_if_ic:
  id: my_pentair
  uart_id: uart_bus
  update_interval: 30s

sensor:
  - platform: pentair_if_ic
    power:
      name: "Pool Pump Power"
    rpm:
      name: "Pool Pump RPM"
    salt_ppm:
      name: "Pool Salt Level"
    water_temp:
      name: "Pool Water Temperature"

number:
  - platform: pentair_if_ic
    swg_percent:
      name: "Chlorine Output"
      id: chlorine_output

switch:
  - platform: pentair_if_ic
    takeover_mode:
      name: "Chlorinator Takeover Mode"

button:
  - platform: template
    name: "Refresh Chlorinator"
    on_press:
      - lambda: |-
          id(my_pentair).refresh_chlorinator();

  - platform: template
    name: "Run Pump at 1450 RPM"
    on_press:
      - lambda: |-
          id(my_pentair).commandRPM(1450);
          
  - platform: template
    name: "Stop Pump"
    on_press:
      - lambda: |-
          id(my_pentair).stop();
```

### Automation Example

```yaml
# Adjust chlorine output based on temperature
automation:
  - interval: 5min
    then:
      - lambda: |-
          float temp = id(water_temp).state;
          if (temp > 85.0) {
            id(chlorine_output).set_value(80);  // Increase output
          } else if (temp < 75.0) {
            id(chlorine_output).set_value(40);  // Decrease output
          }
          
# Run pump program on schedule
time:
  - platform: homeassistant
    on_time:
      - seconds: 0
        minutes: 0
        hours: 8
        then:
          - lambda: |-
              id(my_pentair).commandLocalProgram(0);  // Run Program 1
              
      - seconds: 0
        minutes: 0
        hours: 20
        then:
          - lambda: |-
              id(my_pentair).stop();
```

### Manual Control Buttons

```yaml
button:
  - platform: template
    name: "Low Speed (1450 RPM)"
    on_press:
      - lambda: id(my_pentair).commandRPM(1450);
      
  - platform: template
    name: "Medium Speed (2350 RPM)"
    on_press:
      - lambda: id(my_pentair).commandRPM(2350);
      
  - platform: template
    name: "High Speed (3110 RPM)"
    on_press:
      - lambda: id(my_pentair).commandRPM(3110);
      
  - platform: template
    name: "Priming Speed"
    on_press:
      - lambda: id(my_pentair).commandRPM(3450);
```

## Troubleshooting

### No Communication

- Verify RS485 wiring (A to A, B to B)
- Check UART baud rate is 9600
- Ensure proper RS485 termination resistors
- Verify TX/RX pins are correct

### Checksum Errors

```
[W][pentair_if_ic]: IF CHECKSUM MISMATCH
```

- Usually indicates bus collisions
- Component includes automatic bus arbitration
- Ensure only one device on the bus is controlling the pump/chlorinator

### Buffer Overflow

```
[W][pentair_if_ic]: IC Buffer overflow
```

- Indicates packet corruption
- Check for electrical noise on RS485 lines
- Verify ground connections
- Consider adding line filters

### IC No Response

```
[E][pentair_if_ic]: IC No response removing from send queue
```

- Chlorinator may be offline or in standby
- Check chlorinator power
- Verify RS485 connections
- Try manual refresh: `id(my_pentair).refresh_chlorinator()`

### Clock Setting Not Supported

```
[W][pentair_if_ic]: IF Setting pump clock - NOTE: Many IntelliFlo models don't support clock setting via RS485
[I][pentair_if_ic]: IF Package received: A5.00.10.60.FF.01.19.02.2E
```

- Most IntelliFlo models don't support setting the clock via RS485
- Error response `0xFF 0x19` indicates command not implemented in pump firmware
- Clock can be read from pump status but cannot be set remotely
- Use pump's physical keypad to set the clock manually
- The `setPumpClock()` function is provided for models that do support it, but will fail on most pumps

## Protocol Details

### IntelliFlo Protocol
- Baud Rate: 9600
- Packet Format: `FF 00 FF A5 ...`
- Checksum: 16-bit sum

### IntelliChlor Protocol
- Baud Rate: 9600
- Packet Format: `10 02 ... 10 03`
- Checksum: 8-bit CRC

### Bus Arbitration
- 150ms minimum gap between transmissions
- 100ms quiet time before transmitting
- Separate queues for IntelliFlo and IntelliChlor packets

## Version History

- **v1.0**: Initial release with unified IntelliFlo + IntelliChlor support
- Support for shared RS485 bus with automatic arbitration
- Configurable polling intervals
- Manual refresh capability

## License

This component is provided as-is for use with ESPHome and Home Assistant.

## Credits

Based on original separate components:
- Pentair IntelliFlo component (https://github.com/nicostrown/ESPHome-Pentair-Intelliflo)
- Pentair IntelliChlor component (https://github.com/wolfson292/intellichlor)

Combined and enhanced for shared RS485 bus operation.
