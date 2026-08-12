#ifndef OT_ENGINE_DOCUMENT_HPP
#define OT_ENGINE_DOCUMENT_HPP
#include "ot/operation.hpp"
#include <string>
namespace ot {
class Document {
public:
    Document() = default;
    explicit Document(std::string text) : text_(std::move(text)) {}
    const std::string& str() const { return text_; }
    size_t length() const { return text_.length(); }
    void apply(const Operation& op);
    static std::string apply(const std::string& doc, const Operation& op);
private:
    std::string text_;
};
}
#endif 
