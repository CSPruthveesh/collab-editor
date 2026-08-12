const createOTEngine = require('../frontend/wasm/ot_engine.js');
async function runTests() {
    console.log("=== Testing WebAssembly C++ OT Engine in Node.js ===");
    const OTEngine = await createOTEngine();
    const doc = "Hello World";
    const op_json = JSON.stringify([{r: 6}, {i: "Beautiful "}, {r: 5}]);
    const res = OTEngine.apply_json(doc, op_json);
    console.log("Apply Result:", res);
    if (res !== "Hello Beautiful World") throw new Error("apply_json failed!");
    const op_a = JSON.stringify([{r: 6}, {i: "Brave "}, {r: 5}]);
    const op_b = JSON.stringify([{r: 6}, {d: 5}]);
    const a_prime = OTEngine.transform_a_json(op_a, op_b);
    const b_prime = OTEngine.transform_b_json(op_a, op_b);
    const final_a = OTEngine.apply_json(OTEngine.apply_json(doc, op_a), b_prime);
    const final_b = OTEngine.apply_json(OTEngine.apply_json(doc, op_b), a_prime);
    console.log("Final A (Doc -> A -> B'):", final_a);
    console.log("Final B (Doc -> B -> A'):", final_b);
    if (final_a !== final_b || final_a !== "Hello Brave ") throw new Error("Wasm Transform Convergence failed!");
    console.log("=== ALL WASM MODULE TESTS PASSED SUCCESSFULLY! ===");
}
runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
