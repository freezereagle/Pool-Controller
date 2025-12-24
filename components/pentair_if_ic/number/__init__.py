import esphome.codegen as cg
from esphome.components import number
import esphome.config_validation as cv
from esphome.const import (
    DEVICE_CLASS_ILLUMINANCE,
    ENTITY_CATEGORY_CONFIG,
    ICON_LIGHTBULB,
)
from .. import CONF_PENTAIR_IF_IC_ID, PentairIfIcComponent, pentair_if_ic_ns

SWGPercentNumber = pentair_if_ic_ns.class_("SWGPercentNumber", number.Number)

CONF_SWG_PERCENT = "swg_percent"

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(CONF_PENTAIR_IF_IC_ID): cv.use_id(PentairIfIcComponent),
        cv.Optional(CONF_SWG_PERCENT): number.number_schema(
            SWGPercentNumber,
            device_class=DEVICE_CLASS_ILLUMINANCE,
            entity_category=ENTITY_CATEGORY_CONFIG,
            icon=ICON_LIGHTBULB,
        ),
    }
)


async def to_code(config):
    pentair_component = await cg.get_variable(config[CONF_PENTAIR_IF_IC_ID])
    if swg_percent_config := config.get(CONF_SWG_PERCENT):
        n = await number.new_number(
            swg_percent_config, min_value=0, max_value=100, step=1
        )
        await cg.register_parented(n, config[CONF_PENTAIR_IF_IC_ID])
        cg.add(pentair_component.set_swg_percent_number(n))
