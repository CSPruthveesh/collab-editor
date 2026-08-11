#include "ot/operation.hpp"
#include <variant>

namespace ot {

Operation& Operation::retain(size_t count) {
    if (count == 0) return *this;
    
    if (!components_.empty() && std::holds_alternative<Retain>(components_.back())) {
        std::get<Retain>(components_.back()).count += count;
    } else {
        components_.push_back(Retain{count});
    }
    return *this;
}

Operation& Operation::insert(const std::string& text) {
    if (text.empty()) return *this;

    if (!components_.empty() && std::holds_alternative<Insert>(components_.back())) {
        std::get<Insert>(components_.back()).text += text;
    } else {
        components_.push_back(Insert{text});
    }
    return *this;
}

Operation& Operation::del(size_t count) {
    if (count == 0) return *this;

    if (!components_.empty() && std::holds_alternative<Delete>(components_.back())) {
        std::get<Delete>(components_.back()).count += count;
    } else {
        components_.push_back(Delete{count});
    }
    return *this;
}

size_t Operation::base_length() const {
    size_t len = 0;
    for (const auto& comp : components_) {
        std::visit([&len](auto&& arg) {
            using T = std::decay_t<decltype(arg)>;
            if constexpr (std::is_same_v<T, Retain>) {
                len += arg.count;
            } else if constexpr (std::is_same_v<T, Delete>) {
                len += arg.count;
            }
            
        }, comp);
    }
    return len;
}

size_t Operation::target_length() const {
    size_t len = 0;
    for (const auto& comp : components_) {
        std::visit([&len](auto&& arg) {
            using T = std::decay_t<decltype(arg)>;
            if constexpr (std::is_same_v<T, Retain>) {
                len += arg.count;
            } else if constexpr (std::is_same_v<T, Insert>) {
                len += arg.text.size();
            }
            
        }, comp);
    }
    return len;
}

bool Operation::operator==(const Operation& other) const {
    return components_ == other.components_;
}

} 