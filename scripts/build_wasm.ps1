$projectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $projectRoot

Write-Host "=== Building WebAssembly Module (Emscripten) ===" -ForegroundColor Cyan

if (-not (Test-Path "frontend\wasm")) {
    New-Item -ItemType Directory -Path "frontend\wasm" | Out-Null
}

emcc -O3 -std=c++17 --bind `
    -s MODULARIZE=1 `
    -s EXPORT_NAME="OTEngine" `
    -s ALLOW_MEMORY_GROWTH=1 `
    -fno-rtti -fno-exceptions `
    -I "$projectRoot\ot_engine\include" `
    "$projectRoot\ot_engine\src\operation.cpp" `
    "$projectRoot\ot_engine\src\document.cpp" `
    "$projectRoot\ot_engine\src\transform.cpp" `
    "$projectRoot\ot_engine\src\composer.cpp" `
    "$projectRoot\ot_engine\src\serialization.cpp" `
    "$projectRoot\ot_engine\bindings\embind_module.cpp" `
    -o "$projectRoot\frontend\wasm\ot_engine.js"

Write-Host "=== Successfully generated frontend/wasm/ot_engine.js and frontend/wasm/ot_engine.wasm ===" -ForegroundColor Cyan
Set-Location $projectRoot