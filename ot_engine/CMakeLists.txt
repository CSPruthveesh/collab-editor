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
)

add_library(ot_core STATIC ${OT_SOURCES})

option(BUILD_TESTS "Build OT engine unit tests" ON)

if(BUILD_TESTS)
    enable_testing()
    add_executable(test_ot_engine tests/test_main.cpp)
    target_link_libraries(test_ot_engine PRIVATE ot_core)
    add_test(NAME ot_engine_tests COMMAND test_ot_engine)
endif()
