#pragma once

#include "esphome/components/number/number.h"
#include "../pentair_if_ic.h"

namespace esphome {
namespace pentair_if_ic {

class SWGPercentNumber : public number::Number, public Parented<PentairIfIcComponent> {
 public:
  SWGPercentNumber() = default;

 protected:
  void control(float value) override;
};

}  // namespace pentair_if_ic
}  // namespace esphome
