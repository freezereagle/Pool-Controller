import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import sensor
from esphome.const import (
    DEVICE_CLASS_POWER,
    DEVICE_CLASS_VOLUME_FLOW_RATE,
    DEVICE_CLASS_PRESSURE,
    DEVICE_CLASS_DURATION,
    DEVICE_CLASS_TEMPERATURE,
    DEVICE_CLASS_VOLATILE_ORGANIC_COMPOUNDS_PARTS,
    UNIT_WATT,
    UNIT_REVOLUTIONS_PER_MINUTE,
    UNIT_CUBIC_METER_PER_HOUR,
    UNIT_MINUTE,
    UNIT_PARTS_PER_MILLION,
    UNIT_PERCENT,
)
from . import CONF_PENTAIR_IF_IC_ID, PentairIfIcComponent

DEPENDENCIES = ["pentair_if_ic"]

# IntelliFlo sensors
CONF_POWER = "power"
CONF_RPM = "rpm"
CONF_FLOW = "flow"
CONF_PRESSURE = "pressure"
CONF_TIME_REMAINING = "time_remaining"
CONF_CLOCK = "clock"

# IntelliChlor sensors
CONF_SALT_PPM = "salt_ppm"
CONF_WATER_TEMP = "water_temp"
CONF_STATUS = "status"
CONF_ERROR = "error"
CONF_SET_PERCENT = "set_percent"

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(CONF_PENTAIR_IF_IC_ID): cv.use_id(PentairIfIcComponent),
        # IntelliFlo sensors
        cv.Optional(CONF_POWER): sensor.sensor_schema(
            unit_of_measurement=UNIT_WATT,
            accuracy_decimals=0,
            device_class=DEVICE_CLASS_POWER,
        ),
        cv.Optional(CONF_RPM): sensor.sensor_schema(
            unit_of_measurement=UNIT_REVOLUTIONS_PER_MINUTE,
            accuracy_decimals=0,
        ),
        cv.Optional(CONF_FLOW): sensor.sensor_schema(
            unit_of_measurement=UNIT_CUBIC_METER_PER_HOUR,
            accuracy_decimals=2,
            device_class=DEVICE_CLASS_VOLUME_FLOW_RATE,
        ),
        cv.Optional(CONF_PRESSURE): sensor.sensor_schema(
            unit_of_measurement="bar",
            accuracy_decimals=3,
            device_class=DEVICE_CLASS_PRESSURE,
        ),
        cv.Optional(CONF_TIME_REMAINING): sensor.sensor_schema(
            unit_of_measurement=UNIT_MINUTE,
            accuracy_decimals=0,
            device_class=DEVICE_CLASS_DURATION,
        ),
        cv.Optional(CONF_CLOCK): sensor.sensor_schema(
            unit_of_measurement=UNIT_MINUTE,
            accuracy_decimals=0,
            device_class=DEVICE_CLASS_DURATION,
        ),
        # IntelliChlor sensors
        cv.Optional(CONF_SALT_PPM): sensor.sensor_schema(
            device_class=DEVICE_CLASS_VOLATILE_ORGANIC_COMPOUNDS_PARTS,
            unit_of_measurement=UNIT_PARTS_PER_MILLION,
        ),
        cv.Optional(CONF_WATER_TEMP): sensor.sensor_schema(
            device_class=DEVICE_CLASS_TEMPERATURE,
            unit_of_measurement="°F",
        ),
        cv.Optional(CONF_STATUS): sensor.sensor_schema(),
        cv.Optional(CONF_ERROR): sensor.sensor_schema(),
        cv.Optional(CONF_SET_PERCENT): sensor.sensor_schema(
            unit_of_measurement=UNIT_PERCENT,
        ),
    }
)


async def to_code(config):
    var = await cg.get_variable(config[CONF_PENTAIR_IF_IC_ID])
    
    # IntelliFlo sensors
    if power_config := config.get(CONF_POWER):
        sens = await sensor.new_sensor(power_config)
        cg.add(var.set_if_power(sens))
    
    if rpm_config := config.get(CONF_RPM):
        sens = await sensor.new_sensor(rpm_config)
        cg.add(var.set_if_rpm(sens))
    
    if flow_config := config.get(CONF_FLOW):
        sens = await sensor.new_sensor(flow_config)
        cg.add(var.set_if_flow(sens))
    
    if pressure_config := config.get(CONF_PRESSURE):
        sens = await sensor.new_sensor(pressure_config)
        cg.add(var.set_if_pressure(sens))
    
    if time_remaining_config := config.get(CONF_TIME_REMAINING):
        sens = await sensor.new_sensor(time_remaining_config)
        cg.add(var.set_if_time_remaining(sens))
    
    if clock_config := config.get(CONF_CLOCK):
        sens = await sensor.new_sensor(clock_config)
        cg.add(var.set_if_clock(sens))
    
    # IntelliChlor sensors
    if salt_ppm_config := config.get(CONF_SALT_PPM):
        sens = await sensor.new_sensor(salt_ppm_config)
        cg.add(var.set_salt_ppm_sensor(sens))
    
    if temp_config := config.get(CONF_WATER_TEMP):
        sens = await sensor.new_sensor(temp_config)
        cg.add(var.set_water_temp_sensor(sens))
    
    if status_config := config.get(CONF_STATUS):
        sens = await sensor.new_sensor(status_config)
        cg.add(var.set_ic_status_sensor(sens))
    
    if error_config := config.get(CONF_ERROR):
        sens = await sensor.new_sensor(error_config)
        cg.add(var.set_ic_error_sensor(sens))
    
    if set_percent_config := config.get(CONF_SET_PERCENT):
        sens = await sensor.new_sensor(set_percent_config)
        cg.add(var.set_set_percent_sensor(sens))
