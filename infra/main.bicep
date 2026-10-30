@description('Azure region shared by the regional resources.')
param location string = resourceGroup().location

@minLength(3)
@maxLength(10)
@description('Lowercase alphanumeric prefix, globally unique where required.')
param namePrefix string

@description('Static Web Apps resource name.')
param staticWebAppName string

@description('Name of the existing Azure Cosmos DB for NoSQL account.')
param cosmosAccountName string

@description('Existing Cosmos DB database where the separate leaderboard container will be created.')
param cosmosDatabaseId string

@description('Only new Cosmos container used by this game; do not point it at the maze-rescue container.')
param cosmosContainerId string = 'ChicksCannonLeaderboard'

@description('Microsoft Entra tenant ID allowed to sign in to the leaderboard.')
param entraTenantId string

@description('Client/application ID GUID of the protected leaderboard API app registration. Entra v2 access tokens use this as aud.')
param entraApiAudience string

@description('Client/application ID GUID of the single-page app allowed to call the leaderboard API.')
param entraSpaClientId string

var functionAppName = '${namePrefix}-api'
var storageAccountName = toLower(replace('${namePrefix}storage', '-', ''))
var cosmosEndpoint = 'https://${cosmosAccountName}.documents.azure.com:443/'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

resource functionPlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${namePrefix}-func-plan'
  location: location
  kind: 'linux'
  sku: { name: 'Y1', tier: 'Dynamic' }
  properties: { reserved: true }
}

resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storage.listKeys().keys[0].value}' }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
        { name: 'LEADERBOARD_STORE', value: 'cosmos' }
        { name: 'COSMOS_ENDPOINT', value: cosmosEndpoint }
        { name: 'COSMOS_DATABASE_ID', value: cosmosDatabaseId }
        { name: 'COSMOS_CONTAINER_ID', value: cosmosContainerId }
        { name: 'ENTRA_TENANT_ID', value: entraTenantId }
        { name: 'ENTRA_API_AUDIENCE', value: entraApiAudience }
        { name: 'ENTRA_SPA_CLIENT_ID', value: entraSpaClientId }
      ]
    }
  }
}

resource staticWebApp 'Microsoft.Web/staticSites@2024-04-01' = {
  name: staticWebAppName
  location: location
  sku: { name: 'Standard', tier: 'Standard' }
  properties: {
    provider: 'GitHub'
    buildProperties: { skipGithubActionWorkflowGeneration: true }
  }
}

output staticWebAppResourceName string = staticWebApp.name
output staticWebAppHostname string = staticWebApp.properties.defaultHostname
output functionAppResourceName string = functionApp.name
output functionAppHostname string = functionApp.properties.defaultHostName
