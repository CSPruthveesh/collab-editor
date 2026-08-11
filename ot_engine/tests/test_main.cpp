#include "ot/operation.hpp"
#include "ot/document.hpp"
#include "ot/transform.hpp"
#include "ot/composer.hpp"
#include <iostream>
#include <cassert>
#include <string>

void test_operation_lengths() {
    std::cout << "Starting test_operation_lengths..." << std::endl;
    ot::Operation op;
    op.retain(5).insert("World").del(3);
    
    std::cout << "base_length=" << op.base_length() << ", target_length=" << op.target_length() << std::endl;
    assert(op.base_length() == 8);   
    assert(op.target_length() == 10);
    std::cout << "[PASS] test_operation_lengths" << std::endl;
}

void test_document_apply() {
    ot::Document doc("Hello World");

    ot::Operation op;
    op.retain(6).insert("Beautiful ").retain(5);
    
    doc.apply(op);
    assert(doc.str() == "Hello Beautiful World");
    std::cout << "[PASS] test_document_apply\n";
}

void test_transform_convergence() {
    std::string base_doc = "Hello World";
    
    ot::Operation op_a;
    op_a.retain(6).insert("Brave ").retain(5);
    
    ot::Operation op_b;
    op_b.retain(6).del(5);

    auto [a_prime, b_prime] = ot::transform(op_a, op_b);
    
    std::string doc_a = ot::Document::apply(base_doc, op_a);
    std::string final_a = ot::Document::apply(doc_a, b_prime);
    
    std::string doc_b = ot::Document::apply(base_doc, op_b);
    std::string final_b = ot::Document::apply(doc_b, a_prime);
    
    assert(final_a == final_b);
    assert(final_a == "Hello Brave ");
    std::cout << "[PASS] test_transform_convergence\n";
}

void test_compose() {
    std::string doc = "Hello";
    
    ot::Operation op1;
    op1.retain(5).insert(" "); 
    
    ot::Operation op2;
    op2.retain(6).insert("World"); 
    
    ot::Operation composed = ot::compose(op1, op2);
    
    std::string result_sequential = ot::Document::apply(ot::Document::apply(doc, op1), op2);
    std::string result_composed = ot::Document::apply(doc, composed);
    
    assert(result_sequential == result_composed);
    assert(result_composed == "Hello World");
    std::cout << "[PASS] test_compose\n";
}

#include "ot/serialization.hpp"

void test_serialization() {
    ot::Operation op;
    op.retain(6).insert("Beautiful ").del(5);

    std::string json = ot::to_json(op);
    assert(json == "[{\"r\":6},{\"i\":\"Beautiful \"},{\"d\":5}]");

    ot::Operation parsed = ot::from_json(json);
    assert(parsed == op);
    std::cout << "[PASS] test_serialization\n";
}

int main() {
    std::cout << "=== Running C++ OT Engine Test Suite ===\n";
    test_operation_lengths();
    test_document_apply();
    test_transform_convergence();
    test_compose();
    test_serialization();
    std::cout << "=== ALL TESTS PASSED SUCCESSFULLY! ===\n";
    return 0;
}