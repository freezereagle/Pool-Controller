#include "swg_percent_number.h"

namespace esphome {
namespace pentair_if_ic {

void SWGPercentNumber::control(float value) {
  this->publish_state(value);
  this->parent_->set_swg_percent();
}

}  // namespace pentair_if_ic
}  // namespace esphome
