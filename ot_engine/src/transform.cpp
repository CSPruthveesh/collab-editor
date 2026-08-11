#include "ot/transform.hpp"
#include <stdexcept>
#include <variant>
#include <algorithm>

namespace ot {

std::pair<Operation, Operation> transform(const Operation& op_a, const Operation& op_b) {
    if (op_a.base_length() != op_b.base_length()) {
        throw std::invalid_argument("Operation base lengths must match for transform");
    }

    Operation a_prime;
    Operation b_prime;

    auto comps_a = op_a.components();
    auto comps_b = op_b.components();

    size_t ia = 0, ib = 0;

    bool has_a = false, has_b = false;
    Component ca, cb;

    while (ia < comps_a.size() || has_a || ib < comps_b.size() || has_b) {
        if (!has_a && ia < comps_a.size()) {
            ca = comps_a[ia++];
            has_a = true;
        }
        if (!has_b && ib < comps_b.size()) {
            cb = comps_b[ib++];
            has_b = true;
        }


        if (has_a && std::holds_alternative<Insert>(ca)) {
            const auto& ins_a = std::get<Insert>(ca);
            a_prime.insert(ins_a.text);
            b_prime.retain(ins_a.text.size());
            has_a = false;
            continue;
        }
        if (has_b && std::holds_alternative<Insert>(cb)) {
            const auto& ins_b = std::get<Insert>(cb);
            a_prime.retain(ins_b.text.size());
            b_prime.insert(ins_b.text);
            has_b = false;
            continue;
        }

        if (!has_a || !has_b) {
            throw std::runtime_error("Mismatched component lengths in transform");
        }

        
        if (std::holds_alternative<Retain>(ca) && std::holds_alternative<Retain>(cb)) {
            auto& ra = std::get<Retain>(ca);
            auto& rb = std::get<Retain>(cb);

            size_t min_len = std::min(ra.count, rb.count);
            a_prime.retain(min_len);
            b_prime.retain(min_len);

            ra.count -= min_len;
            rb.count -= min_len;

            if (ra.count == 0) has_a = false;
            if (rb.count == 0) has_b = false;
        }
        
        else if (std::holds_alternative<Delete>(ca) && std::holds_alternative<Delete>(cb)) {
            auto& da = std::get<Delete>(ca);
            auto& db = std::get<Delete>(cb);

            size_t min_len = std::min(da.count, db.count);
            
            da.count -= min_len;
            db.count -= min_len;

            if (da.count == 0) has_a = false;
            if (db.count == 0) has_b = false;
        }
        
        else if (std::holds_alternative<Delete>(ca) && std::holds_alternative<Retain>(cb)) {
            auto& da = std::get<Delete>(ca);
            auto& rb = std::get<Retain>(cb);

            size_t min_len = std::min(da.count, rb.count);
            a_prime.del(min_len);

            da.count -= min_len;
            rb.count -= min_len;

            if (da.count == 0) has_a = false;
            if (rb.count == 0) has_b = false;
        }
        
        else if (std::holds_alternative<Retain>(ca) && std::holds_alternative<Delete>(cb)) {
            auto& ra = std::get<Retain>(ca);
            auto& db = std::get<Delete>(cb);

            size_t min_len = std::min(ra.count, db.count);
            b_prime.del(min_len);

            ra.count -= min_len;
            db.count -= min_len;

            if (ra.count == 0) has_a = false;
            if (db.count == 0) has_b = false;
        }
    }

    return {a_prime, b_prime};
}

} // namespace ot