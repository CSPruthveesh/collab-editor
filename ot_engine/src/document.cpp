#include "ot/document.hpp"
#include <stdexcept>
#include <variant>

namespace ot {

std::string Document::apply(const std::string& doc, const Operation& op) {
    if (op.base_length() != doc.length()) {
        throw std::invalid_argument("Operation base_length does not match document length");
    }

    std::string result;
    result.reserve(op.target_length());

    size_t doc_pos = 0;

    for (const auto& comp : op.components()) {
        std::visit([&](auto&& arg) {
            using T = std::decay_t<decltype(arg)>;
            if constexpr (std::is_same_v<T, Retain>) {
                if (doc_pos + arg.count > doc.length()) {
                    throw std::out_of_range("Retain count exceeds document length");
                }
                result.append(doc, doc_pos, arg.count);
                doc_pos += arg.count;
            } else if constexpr (std::is_same_v<T, Insert>) {
                result.append(arg.text);
            } else if constexpr (std::is_same_v<T, Delete>) {
                if (doc_pos + arg.count > doc.length()) {
                    throw std::out_of_range("Delete count exceeds document length");
                }
                doc_pos += arg.count;
            }
        }, comp);
    }

    if (doc_pos != doc.length()) {
        throw std::runtime_error("Operation did not consume entire document");
    }

    return result;
}

void Document::apply(const Operation& op) {
    text_ = apply(text_, op);
}

} 