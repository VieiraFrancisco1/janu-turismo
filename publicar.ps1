$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Verificar($etapa) {
  if ($LASTEXITCODE -ne 0) { throw "Falha em $etapa (código $LASTEXITCODE)." }
}

$projectId = (Read-Host 'ID do projeto Firebase').Trim()
$apiKey = (Read-Host 'apiKey do aplicativo Web (Configurações do projeto)').Trim()
$appId = (Read-Host 'appId do aplicativo Web').Trim()
$adminUid = (Read-Host 'UID da conta da agência (Authentication > Usuários)').Trim()
$siteId = (Read-Host 'ID do site público (Enter = janu-turismo-ce)').Trim()
if (-not $siteId) { $siteId = 'janu-turismo-ce' }
if ($projectId -notmatch '^[a-z][a-z0-9-]{5,29}$' -or
    $apiKey -notmatch '^AIza[A-Za-z0-9_-]{20,}$' -or
    $appId -notmatch '^1:[0-9]+:web:[A-Za-z0-9]+$' -or
    $adminUid -notmatch '^[A-Za-z0-9]{16,128}$') {
  throw 'Um dos identificadores está inválido. Copie os valores diretamente do Firebase Console.'
}

$config = @{ apiKey=$apiKey; authDomain="$projectId.firebaseapp.com"; projectId=$projectId; appId=$appId } | ConvertTo-Json -Compress
$utf8 = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'firebase-config.js'), "export const firebaseConfig = $config;`n", $utf8)
$rulesTemplate = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'firestore.rules.template'))
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'firestore.rules'), $rulesTemplate.Replace('__ADMIN_UID__', $adminUid), $utf8)

npm.cmd ci
Verificar 'instalação'
npm.cmd run build
Verificar 'montagem do site'
npx.cmd --yes firebase-tools@latest login
Verificar 'login no Firebase'
npx.cmd --yes firebase-tools@latest target:apply hosting publico $siteId --project $projectId
Verificar 'associação do site público'
npx.cmd --yes firebase-tools@latest deploy --only 'firestore:rules,hosting' --project $projectId
Verificar 'publicação'
Write-Host "Publicado em https://$siteId.web.app/"
