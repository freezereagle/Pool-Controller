import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.const import CONF_ID
from esphome.components import uart
from esphome import pins
from esphome.const import CONF_FLOW_CONTROL_PIN

MULTI_CONF = True
DEPENDENCIES = ["uart"]
CODEOWNERS = ["@wolfson292"]

pentair_if_ic_ns = cg.esphome_ns.namespace("pentair_if_ic")
PentairIfIcComponent = pentair_if_ic_ns.class_("PentairIfIcComponent", cg.PollingComponent, uart.UARTDevice)

CONF_PENTAIR_IF_IC_ID = "pentair_if_ic_id"

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(PentairIfIcComponent),
        cv.Optional(CONF_FLOW_CONTROL_PIN): pins.gpio_output_pin_schema,
    }
).extend(uart.UART_DEVICE_SCHEMA).extend(cv.polling_component_schema("30s"))

FINAL_VALIDATE_SCHEMA = uart.final_validate_device_schema(
    "pentair_if_ic",
    require_tx=True,
    require_rx=True,
    baud_rate=9600,
    parity="NONE",
    stop_bits=1,
)


async def to_code(config):
    from esphome.cpp_helpers import gpio_pin_expression
    
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    await uart.register_uart_device(var, config)

    if CONF_FLOW_CONTROL_PIN in config:
        pin = await gpio_pin_expression(config[CONF_FLOW_CONTROL_PIN])
        cg.add(var.set_flow_control_pin(pin))
