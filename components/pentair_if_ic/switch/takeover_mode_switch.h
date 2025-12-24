#pragma once

#include "esphome/components/switch/switch.h"
#include "../pentair_if_ic.h"

namespace esphome {
namespace pentair_if_ic {

class TakeoverModeSwitch : public switch_::Switch, public Parented<PentairIfIcComponent> {
 public:
  TakeoverModeSwitch() = default;

 protected:
  void write_state(bool state) override;
};

}  // namespace pentair_if_ic
}  // namespace esphome
