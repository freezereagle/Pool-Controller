import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.const import CONF_ID
from esphome.core import CORE

DEPENDENCIES = ["web_server_base"]
CODEOWNERS = ["@custom"]

custom_web_handler_ns = cg.esphome_ns.namespace("custom_web_handler")
CustomWebHandler = custom_web_handler_ns.class_("CustomWebHandler", cg.Component)

CONF_ENDPOINTS = "endpoints"
CONF_PATH = "path"
CONF_CONTENT_TYPE = "content_type"
CONF_RESPONSE = "response"
CONF_TEXT = "text"
CONF_FILE = "file"
CONF_URL = "url"

ENDPOINT_SCHEMA = cv.Schema(
    {
        cv.Required(CONF_PATH): cv.string,
        cv.Optional(CONF_CONTENT_TYPE, default="text/html"): cv.string,
        cv.Optional(CONF_TEXT): cv.string,
        cv.Optional(CONF_FILE): cv.file_,
        cv.Optional(CONF_URL): cv.url,
    }
).add_extra(
    cv.has_exactly_one_key(CONF_TEXT, CONF_FILE, CONF_URL)
)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(CustomWebHandler),
        cv.Required(CONF_ENDPOINTS): cv.ensure_list(ENDPOINT_SCHEMA),
    }
).extend(cv.COMPONENT_SCHEMA)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    
    for i, endpoint in enumerate(config[CONF_ENDPOINTS]):
        path = endpoint[CONF_PATH]
        content_type = endpoint[CONF_CONTENT_TYPE]
        
        if CONF_TEXT in endpoint:
            # Static text response
            cg.add(var.add_text_endpoint(path, content_type, endpoint[CONF_TEXT]))
        elif CONF_FILE in endpoint:
            # Embedded file response - declare as progmem array
            with open(CORE.relative_config_path(endpoint[CONF_FILE]), "rb") as f:
                file_content = f.read()
            
            # Create a unique identifier for this file
            file_var_name = f"custom_web_file_{i}"
            
            # Generate the progmem declaration manually
            data_hex = ", ".join(f"0x{b:02x}" for b in file_content)
            cg.add_global(cg.RawStatement(
                f"static const uint8_t {file_var_name}[] PROGMEM = {{{data_hex}}};"
            ))
            
            cg.add(var.add_file_endpoint(path, content_type, cg.RawExpression(file_var_name), len(file_content)))
        elif CONF_URL in endpoint:
            # URL proxy response
            cg.add(var.add_url_endpoint(path, content_type, endpoint[CONF_URL]))
