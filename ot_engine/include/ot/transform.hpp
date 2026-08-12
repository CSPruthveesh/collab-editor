#ifndef OT_ENGINE_TRANSFORM_HPP
#define OT_ENGINE_TRANSFORM_HPP
#include "ot/operation.hpp"
#include <utility>
namespace ot {
std::pair<Operation, Operation> transform(const Operation& op_a, const Operation& op_b);
} 
#endif 
