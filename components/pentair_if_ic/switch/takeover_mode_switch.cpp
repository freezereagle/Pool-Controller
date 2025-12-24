#include "takeover_mode_switch.h"

namespace esphome {
namespace pentair_if_ic {

void TakeoverModeSwitch::write_state(bool state) {
  this->publish_state(state);
  this->parent_->set_takeover_mode(state);
}

}  // namespace pentair_if_ic
}  // namespace esphome
