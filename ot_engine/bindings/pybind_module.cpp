#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include "ot/operation.hpp"
#include "ot/document.hpp"
#include "ot/transform.hpp"
#include "ot/composer.hpp"
#include "ot/serialization.hpp"

namespace py = pybind11;

PYBIND11_MODULE(ot_engine, m) {
    m.doc() = "C++ Operational Transformation Engine bindings for Python";

    
    py::class_<ot::Retain>(m, "Retain")
        .def_readwrite("count", &ot::Retain::count);

    py::class_<ot::Insert>(m, "Insert")
        .def_readwrite("text", &ot::Insert::text);

    py::class_<ot::Delete>(m, "Delete")
        .def_readwrite("count", &ot::Delete::count);

    
    py::class_<ot::Operation>(m, "Operation")
        .def(py::init<>())
        .def("retain", &ot::Operation::retain, py::return_value_policy::reference)
        .def("insert", &ot::Operation::insert, py::return_value_policy::reference)
        .def("delete", &ot::Operation::del, py::return_value_policy::reference)
        .def("base_length", &ot::Operation::base_length)
        .def("target_length", &ot::Operation::target_length)
        .def("__eq__", &ot::Operation::operator==);

    
    py::class_<ot::Document>(m, "Document")
        .def(py::init<>())
        .def(py::init<std::string>())
        .def("str", &ot::Document::str)
        .def("length", &ot::Document::length)
        .def("apply", static_cast<void (ot::Document::*)(const ot::Operation&)>(&ot::Document::apply))
        .def_static("apply_static", static_cast<std::string (*)(const std::string&, const ot::Operation&)>(&ot::Document::apply));

    
    m.def("transform", &ot::transform, "Transform two concurrent operations");
    m.def("compose", &ot::compose, "Compose two sequential operations");
    m.def("to_json", &ot::to_json, "Serialize Operation to JSON string");
    m.def("from_json", &ot::from_json, "Deserialize JSON string to Operation");
}