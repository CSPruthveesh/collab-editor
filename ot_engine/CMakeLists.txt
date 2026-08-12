cmake_minimum_required(VERSION 3.15)
project(ot_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

set(OT_SOURCES
    src/operation.cpp
    src/document.cpp
    src/transform.cpp
    src/composer.cpp
    src/serialization.cpp
)

add_library(ot_core STATIC ${OT_SOURCES})

# Target selection: native (default) vs wasm
set(BUILD_TARGET "native" CACHE STRING "Build target: native or wasm")

if(EMSCRIPTEN OR BUILD_TARGET STREQUAL "wasm")
    message(STATUS "Building WebAssembly target with Emscripten Embind")
    add_executable(ot_engine_wasm bindings/embind_module.cpp)
    target_link_libraries(ot_engine_wasm PRIVATE ot_core)
    set_target_properties(ot_engine_wasm PROPERTIES
        OUTPUT_NAME "ot_engine"
        SUFFIX ".js"
        LINK_FLAGS "-s MODULARIZE=1 -s EXPORT_NAME='OTEngine' -s ALLOW_MEMORY_GROWTH=1 --bind -O3"
    )
else()
    message(STATUS "Building Native Python module with pybind11")
    find_package(pybind11 CONFIG QUIET)
    if(pybind11_FOUND)
        pybind11_add_module(ot_engine bindings/pybind_module.cpp)
        target_link_libraries(ot_engine PRIVATE ot_core)
    else()
        message(STATUS "pybind11 not found via CMake find_package; building static core and tests only.")
    endif()
endif()

option(BUILD_TESTS "Build OT engine unit tests" ON)

if(BUILD_TESTS)
    enable_testing()
    add_executable(test_ot_engine tests/test_main.cpp)
    target_link_libraries(test_ot_engine PRIVATE ot_core)
    add_test(NAME ot_engine_tests COMMAND test_ot_engine)
endif()

