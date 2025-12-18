# PowerShell deploy helper for Supabase Edge Function `reveal`
# Usage:
# 1. Copy .env.deploy.example -> .env.deploy and fill values (do NOT commit .env.deploy)
# 2. Install supabase CLI and login: `supabase login`
# 3. Run: `./supabase/deploy-reveal.ps1`

# Basic checks
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Error "Supabase CLI not found. Install it: npm install -g supabase"
  exit 1
}

$envFile = Join-Path $PSScriptRoot "..\.env.deploy"
if (-not (Test-Path $envFile)) {
  Write-Error "Missing .env.deploy. Copy .env.deploy.example to .env.deploy and set values."
  exit 1
}

# Read env file lines into hashtable
$kv = @{}
Get-Content $envFile | ForEach-Object {
  $_ = $_.Trim()
  if (-not $_ -or $_.StartsWith('#')) { return }
  $parts = $_ -split '=', 2
  if ($parts.Count -ne 2) { return }
  $kv[$parts[0]] = $parts[1]
}

if (-not $kv.ContainsKey('PROJECT_REF')) {
  Write-Error "PROJECT_REF not set in .env.deploy"
  exit 1
}
$projectRef = $kv['PROJECT_REF']
Write-Host "Using project ref: $projectRef"

Write-Host "Linking repo to Supabase project..."
supabase link --project-ref $projectRef

Write-Host "Deploying Edge Function 'reveal'..."
Push-Location (Join-Path $PSScriptRoot 'reveal')
try {
  # If function needs dependencies, user should run npm install inside function folder beforehand
  supabase functions deploy reveal --project-ref $projectRef
} finally {
  Pop-Location
}

# Set secrets (service role, twilio) from .env.deploy
$secretKeys = @('SUPABASE_SERVICE_ROLE_KEY','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM')
foreach ($k in $secretKeys) {
  if ($kv.ContainsKey($k) -and $kv[$k]) {
    $pair = "$k=$($kv[$k])"
    Write-Host "Setting secret: $k"
    supabase secrets set $pair --project-ref $projectRef
  }
}

Write-Host "Done. Remember to set VITE_REVEAL_URL in your frontend .env to the deployed function URL and add VITE_SUPABASE_* keys locally."