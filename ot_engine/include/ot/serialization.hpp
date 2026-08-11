#ifndef OT_ENGINE_SERIALIZATION_HPP
#define OT_ENGINE_SERIALIZATION_HPP

#include "ot/operation.hpp"
#include <string>

namespace ot {

std::string to_json(const Operation& op);
Operation from_json(const std::string& json_str);

}

#endif 