#ifndef OT_ENGINE_OPERATION_HPP
#define OT_ENGINE_OPERATION_HPP

#include <string>
#include <vector>
#include <variant>
#include <cstddef>
#include <stdexcept>

namespace ot {

    struct Retain {
        size_t count;
        bool operator == (const Retain& other) const { return count == other.count;}
    };

    struct Insert {
        std::string text;
        bool operator == (const Insert& other) const { return text == other.text;}
    };

    struct Delete {
        size_t count;
        bool operator == (const Delete& other) const { return count == other.count;}
    };

    using Component = std::variant<Retain, Insert, Delete>;

    class Operation {
        public:
        Operation() = default;
        Operation& retain(size_t count);
        Operation& insert(const std::string& text);
        Operation& del(size_t count);

        const std::vector<Component>& components() const { return components_;}

        size_t base_length() const;
        size_t target_length() const;

        bool operator == (const Operation& other) const;
        bool operator != (const Operation& other) const { return !(*this == other);}

        private:
        std::vector<Component> components_;
    };
}

#endif // OT_ENGINE_OPERATION_HPP