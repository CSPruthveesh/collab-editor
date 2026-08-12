import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server")))

if hasattr(os, "add_dll_directory") and os.path.exists(r"C:\msys64\ucrt64\bin"):
    os.add_dll_directory(r"C:\msys64\ucrt64\bin")

def test_pybind_module():
    import ot_engine

    doc = ot_engine.Document("Hello World")
    assert doc.str() == "Hello World"
    assert doc.length() == 11

    op = ot_engine.Operation()
    op.retain(6).insert("Beautiful ").retain(5)

    doc.apply(op)
    assert doc.str() == "Hello Beautiful World"

    op_a = ot_engine.Operation().retain(6).insert("Brave ").retain(5)
    op_b = ot_engine.Operation().retain(6).delete(5)

    a_prime, b_prime = ot_engine.transform(op_a, op_b)

    final_a = ot_engine.Document.apply_static(ot_engine.Document.apply_static("Hello World", op_a), b_prime)
    final_b = ot_engine.Document.apply_static(ot_engine.Document.apply_static("Hello World", op_b), a_prime)

    assert final_a == final_b == "Hello Brave "

    json_str = ot_engine.to_json(op)
    op_parsed = ot_engine.from_json(json_str)
    assert op_parsed == op

    print("=== Python pybind11 OT Engine Test Passed Successfully! ===")

if __name__ == "__main__":
    test_pybind_module()
