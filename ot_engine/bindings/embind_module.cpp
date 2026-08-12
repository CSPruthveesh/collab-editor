#include <emscripten/bind.h>
#include "ot/operation.hpp"
#include "ot/document.hpp"
#include "ot/transform.hpp"
#include "ot/composer.hpp"
#include "ot/serialization.hpp"
using namespace emscripten;
std::string apply_json(const std::string& doc, const std::string& op_json) {
    ot::Operation op = ot::from_json(op_json);
    return ot::Document::apply(doc, op);
}
std::string transform_a_json(const std::string& op_a_json, const std::string& op_b_json) {
    ot::Operation op_a = ot::from_json(op_a_json);
    ot::Operation op_b = ot::from_json(op_b_json);
    auto [a_prime, b_prime] = ot::transform(op_a, op_b);
    return ot::to_json(a_prime);
}
std::string transform_b_json(const std::string& op_a_json, const std::string& op_b_json) {
    ot::Operation op_a = ot::from_json(op_a_json);
    ot::Operation op_b = ot::from_json(op_b_json);
    auto [a_prime, b_prime] = ot::transform(op_a, op_b);
    return ot::to_json(b_prime);
}
std::string compose_json(const std::string& op_a_json, const std::string& op_b_json) {
    ot::Operation op_a = ot::from_json(op_a_json);
    ot::Operation op_b = ot::from_json(op_b_json);
    ot::Operation composed = ot::compose(op_a, op_b);
    return ot::to_json(composed);
}
EMSCRIPTEN_BINDINGS(ot_engine) {
    function("apply_json", &apply_json);
    function("transform_a_json", &transform_a_json);
    function("transform_b_json", &transform_b_json);
    function("compose_json", &compose_json);
}
