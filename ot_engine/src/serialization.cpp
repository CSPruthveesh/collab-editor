#include "ot/serialization.hpp"
#include <sstream>
#include <stdexcept>
#include <variant>

namespace ot {

std::string to_json(const Operation& op) {
    std::ostringstream ss;
    ss << "[";
    bool first = true;

    for (const auto& comp : op.components()) {
        if (!first) ss << ",";
        first = false;

        std::visit([&ss](auto&& arg) {
            using T = std::decay_t<decltype(arg)>;
            if constexpr (std::is_same_v<T, Retain>) {
                ss << "{\"r\":" << arg.count << "}";
            } else if constexpr (std::is_same_v<T, Insert>) {
                
                ss << "{\"i\":\"";
                for (char c : arg.text) {
                    if (c == '"') ss << "\\\"";
                    else if (c == '\\') ss << "\\\\";
                    else if (c == '\n') ss << "\\n";
                    else if (c == '\r') ss << "\\r";
                    else ss << c;
                }
                ss << "\"}";
            } else if constexpr (std::is_same_v<T, Delete>) {
                ss << "{\"d\":" << arg.count << "}";
            }
        }, comp);
    }

    ss << "]";
    return ss.str();
}

Operation from_json(const std::string& json_str) {
    Operation op;
    size_t i = 0;
    
    // Skip whitespace
    auto skip_ws = [&]() {
        while (i < json_str.size() && (json_str[i] == ' ' || json_str[i] == '\t' || json_str[i] == '\n' || json_str[i] == '\r')) {
            i++;
        }
    };

    skip_ws();
    if (i >= json_str.size() || json_str[i] != '[') {
        throw std::invalid_argument("Invalid JSON array start");
    }
    i++; 

    while (i < json_str.size()) {
        skip_ws();
        if (i < json_str.size() && json_str[i] == ']') {
            i++; 
            break;
        }
        if (json_str[i] == ',') {
            i++;
            continue;
        }
        if (json_str[i] == '{') {
            i++;
            skip_ws();
            if (json_str[i] != '"') throw std::invalid_argument("Expected key in JSON object");
            i++;
            char type = json_str[i++];
            if (json_str[i] != '"') throw std::invalid_argument("Expected closing quote for key");
            i++;
            skip_ws();
            if (json_str[i] != ':') throw std::invalid_argument("Expected ':' after key");
            i++;
            skip_ws();

            if (type == 'r') {
                size_t count = 0;
                while (i < json_str.size() && std::isdigit(json_str[i])) {
                    count = count * 10 + (json_str[i] - '0');
                    i++;
                }
                op.retain(count);
            } else if (type == 'd') {
                size_t count = 0;
                while (i < json_str.size() && std::isdigit(json_str[i])) {
                    count = count * 10 + (json_str[i] - '0');
                    i++;
                }
                op.del(count);
            } else if (type == 'i') {
                if (json_str[i] != '"') throw std::invalid_argument("Expected string value for insert");
                i++; 
                std::string text;
                while (i < json_str.size() && json_str[i] != '"') {
                    if (json_str[i] == '\\' && i + 1 < json_str.size()) {
                        i++;
                        if (json_str[i] == '"') text += '"';
                        else if (json_str[i] == '\\') text += '\\';
                        else if (json_str[i] == 'n') text += '\n';
                        else if (json_str[i] == 'r') text += '\r';
                        else text += json_str[i];
                    } else {
                        text += json_str[i];
                    }
                    i++;
                }
                if (i < json_str.size() && json_str[i] == '"') i++; 
                op.insert(text);
            }

            skip_ws();
            if (i < json_str.size() && json_str[i] == '}') {
                i++;
            }
        } else {
            i++;
        }
    }

    return op;
}

} 