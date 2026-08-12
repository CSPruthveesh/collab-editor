$projectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $projectRoot

Write-Host "=== Building Native C++ Python Module (pybind11) ===" -ForegroundColor Green

if (-not (Test-Path "build\native")) {
    New-Item -ItemType Directory -Path "build\native" | Out-Null
}

Set-Location "build\native"

$pyIncludes = (python -m pybind11 --includes)
$pyLibDir = python -c "import sysconfig; print(sysconfig.get_config_var('installed_base') + '/libs')"
$pyVerStr = python -c "import sys; print(f'python{sys.version_info.major}{sys.version_info.minor}')"

$env:PATH = "C:\msys64\ucrt64\bin;" + $env:PATH

& C:\msys64\ucrt64\bin\g++.exe -O3 -shared -std=c++17 -fPIC `
    -I "$projectRoot\ot_engine\include" `
    $pyIncludes.Split(' ') `
    "$projectRoot\ot_engine\src\operation.cpp" `
    "$projectRoot\ot_engine\src\document.cpp" `
    "$projectRoot\ot_engine\src\transform.cpp" `
    "$projectRoot\ot_engine\src\composer.cpp" `
    "$projectRoot\ot_engine\src\serialization.cpp" `
    "$projectRoot\ot_engine\bindings\pybind_module.cpp" `
    -L "$pyLibDir" "-l$pyVerStr" `
    -o "$projectRoot\server\ot_engine.pyd"

Write-Host "=== Successfully built server/ot_engine.pyd ===" -ForegroundColor Green
Set-Location $projectRoot