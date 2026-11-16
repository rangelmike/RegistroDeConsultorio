$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & node harness/verify.mjs @args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}
