#include "ot/composer.hpp"
#include <stdexcept>
#include <variant>
#include <algorithm>

namespace ot {

Operation compose(const Operation& op_a, const Operation& op_b) {
    if (op_a.target_length() != op_b.base_length()) {
        throw std::invalid_argument("op_a target_length must equal op_b base_length for compose");
    }

    Operation result;
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

        
        if (has_a && std::holds_alternative<Delete>(ca)) {
            const auto& da = std::get<Delete>(ca);
            result.del(da.count);
            has_a = false;
            continue;
        }

        
        if (has_b && std::holds_alternative<Insert>(cb)) {
            const auto& ib_comp = std::get<Insert>(cb);
            result.insert(ib_comp.text);
            has_b = false;
            continue;
        }

        if (!has_a || !has_b) {
            throw std::runtime_error("Mismatched component lengths in compose");
        }

        
        if (std::holds_alternative<Retain>(ca) && std::holds_alternative<Retain>(cb)) {
            auto& ra = std::get<Retain>(ca);
            auto& rb = std::get<Retain>(cb);

            size_t min_len = std::min(ra.count, rb.count);
            result.retain(min_len);

            ra.count -= min_len;
            rb.count -= min_len;

            if (ra.count == 0) has_a = false;
            if (rb.count == 0) has_b = false;
        }
        
        else if (std::holds_alternative<Insert>(ca) && std::holds_alternative<Retain>(cb)) {
            auto& ia_comp = std::get<Insert>(ca);
            auto& rb = std::get<Retain>(cb);

            size_t min_len = std::min(ia_comp.text.size(), rb.count);
            result.insert(ia_comp.text.substr(0, min_len));

            ia_comp.text.erase(0, min_len);
            rb.count -= min_len;

            if (ia_comp.text.empty()) has_a = false;
            if (rb.count == 0) has_b = false;
        }
        
        else if (std::holds_alternative<Insert>(ca) && std::holds_alternative<Delete>(cb)) {
            auto& ia_comp = std::get<Insert>(ca);
            auto& db = std::get<Delete>(cb);

            size_t min_len = std::min(ia_comp.text.size(), db.count);
            
            ia_comp.text.erase(0, min_len);
            db.count -= min_len;

            if (ia_comp.text.empty()) has_a = false;
            if (db.count == 0) has_b = false;
        }
        
        else if (std::holds_alternative<Retain>(ca) && std::holds_alternative<Delete>(cb)) {
            auto& ra = std::get<Retain>(ca);
            auto& db = std::get<Delete>(cb);

            size_t min_len = std::min(ra.count, db.count);
            result.del(min_len);

            ra.count -= min_len;
            db.count -= min_len;

            if (ra.count == 0) has_a = false;
            if (db.count == 0) has_b = false;
        }
    }

    return result;
}

} 