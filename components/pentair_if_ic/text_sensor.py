import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import text_sensor
from esphome.const import (
    CONF_VERSION,
    ICON_BUG,
    ENTITY_CATEGORY_DIAGNOSTIC,
)
from . import CONF_PENTAIR_IF_IC_ID, PentairIfIcComponent

DEPENDENCIES = ["pentair_if_ic"]

# IntelliFlo text sensors
CONF_PROGRAM = "program"

# IntelliChlor text sensors
CONF_VERSION = "version"
CONF_DEBUG = "debug"

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(CONF_PENTAIR_IF_IC_ID): cv.use_id(PentairIfIcComponent),
        # IntelliFlo
        cv.Optional(CONF_PROGRAM): text_sensor.text_sensor_schema(),
        # IntelliChlor
        cv.Optional(CONF_VERSION): text_sensor.text_sensor_schema(
            icon=ICON_BUG,
            entity_category=ENTITY_CATEGORY_DIAGNOSTIC,
        ),
        cv.Optional(CONF_DEBUG): text_sensor.text_sensor_schema(
            icon=ICON_BUG,
            entity_category=ENTITY_CATEGORY_DIAGNOSTIC,
        ),
    }
)


async def to_code(config):
    var = await cg.get_variable(config[CONF_PENTAIR_IF_IC_ID])
    
    # IntelliFlo
    if program_config := config.get(CONF_PROGRAM):
        sens = await text_sensor.new_text_sensor(program_config)
        cg.add(var.set_if_program(sens))
    
    # IntelliChlor
    if version_config := config.get(CONF_VERSION):
        sens = await text_sensor.new_text_sensor(version_config)
        cg.add(var.set_ic_version_text_sensor(sens))
    
    if debug_config := config.get(CONF_DEBUG):
        sens = await text_sensor.new_text_sensor(debug_config)
        cg.add(var.set_ic_debug_text_sensor(sens))
