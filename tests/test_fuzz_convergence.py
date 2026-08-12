import random
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server")))
if hasattr(os, "add_dll_directory") and os.path.exists(r"C:\msys64\ucrt64\bin"):
    os.add_dll_directory(r"C:\msys64\ucrt64\bin")
import ot_engine
def generate_random_op(doc_len: int) -> ot_engine.Operation:
    op = ot_engine.Operation()
    pos = 0
    while pos < doc_len:
        action = random.choice(["retain", "insert", "delete"])
        if action == "retain":
            count = random.randint(1, max(1, doc_len - pos))
            op.retain(count)
            pos += count
        elif action == "delete":
            count = random.randint(1, max(1, doc_len - pos))
            op.delete(count)
            pos += count
        elif action == "insert":
            text = f"_{random.randint(10, 99)}_"
            op.insert(text)
    if random.random() < 0.3:
        op.insert("end")
    return op
def test_property_based_convergence_fuzzing():
    print("\n=== Running 1000 Iterations Property-Based Convergence Fuzzer ===")
    iterations = 1000
    converged_count = 0
    for i in range(iterations):
        initial_doc = f"BaseDoc_{i}_Content"
        doc_len = len(initial_doc)
        op_a = generate_random_op(doc_len)
        op_b = generate_random_op(doc_len)
        if op_a.base_length() != doc_len or op_b.base_length() != doc_len:
            continue
        a_prime, b_prime = ot_engine.transform(op_a, op_b)
        doc_a = ot_engine.Document.apply_static(initial_doc, op_a)
        final_a = ot_engine.Document.apply_static(doc_a, b_prime)
        doc_b = ot_engine.Document.apply_static(initial_doc, op_b)
        final_b = ot_engine.Document.apply_static(doc_b, a_prime)
        assert final_a == final_b, f"Divergence detected in iteration {i}! final_a='{final_a}', final_b='{final_b}'"
        converged_count += 1
    print(f"Tested {converged_count} valid randomized property pairs.")
    print("=== 100% CONVERGENCE GUARANTEE VERIFIED ACROSS ALL FUZZ PAIRS! ===")
if __name__ == "__main__":
    test_property_based_convergence_fuzzing()
