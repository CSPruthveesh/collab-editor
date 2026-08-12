import time
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server")))
if hasattr(os, "add_dll_directory") and os.path.exists(r"C:\msys64\ucrt64\bin"):
    os.add_dll_directory(r"C:\msys64\ucrt64\bin")
import ot_engine
def benchmark_ot_transform():
    print("\n=== Running C++ OT Engine Performance Benchmark ===")
    doc_len = 1000
    iterations = 10000
    op_a = ot_engine.Operation().retain(500).insert("BenchMarking").retain(500)
    op_b = ot_engine.Operation().retain(500).delete(10).retain(490)
    start_time = time.perf_counter()
    for _ in range(iterations):
        a_prime, b_prime = ot_engine.transform(op_a, op_b)
    total_time = time.perf_counter() - start_time
    ops_per_sec = iterations / total_time
    avg_latency_us = (total_time / iterations) * 1_000_000
    print(f"Total Iterations: {iterations:,}")
    print(f"Total Time: {total_time:.4f} seconds")
    print(f"Throughput: {ops_per_sec:,.2f} transforms/sec")
    print(f"Average Latency: {avg_latency_us:.3f} microseconds ({avg_latency_us / 1000:.4f} ms)")
    assert avg_latency_us < 1000, "Transform latency exceeded 1ms target!"
    print("=== PERFORMANCE TARGET MET (< 1ms per transform) ===")
if __name__ == "__main__":
    benchmark_ot_transform()
