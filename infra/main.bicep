@description('Azure region shared by the regional resources.')
param location string = resourceGroup().location

@minLength(3)
@maxLength(10)
@description('Lowercase alphanumeric prefix, globally unique where required.')
param namePrefix string

@description('Static Web Apps resource name.')
param staticWebAppName string

@description('SQL database name.')
param sqlDatabaseName string = 'chickscannon'

@description('SQL database SKU. Choose a SKU supported in the target region.')
param sqlDatabaseSkuName string = 'Basic'

@description('SQL logical server admin display name. Use a Microsoft Entra user or group.')
param sqlAdministratorLogin string

@description('Object ID of the Microsoft Entra SQL administrator.')
param sqlAdministratorObjectId string

@description('Tenant ID for the SQL administrator.')
param sqlAdministratorTenantId string

@description('Microsoft Entra tenant ID allowed to sign in to the leaderboard.')
param entraTenantId string

@description('Client/application ID GUID of the protected leaderboard API app registration. Entra v2 access tokens use this as aud.')
param entraApiAudience string

@description('Client/application ID GUID of the single-page app allowed to call the leaderboard API.')
param entraSpaClientId string

@secure()
@description('One-time SQL server bootstrap field required by the ARM API. SQL authentication is disabled; never reuse or commit this value.')
param sqlBootstrapPassword string

var functionAppName = '${namePrefix}-api'
var storageAccountName = toLower(replace('${namePrefix}storage', '-', ''))
var sqlServerName = '${namePrefix}-sql'

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
        { name: 'LEADERBOARD_STORE', value: 'sql' }
        { name: 'AZURE_SQL_SERVER', value: '${sqlServer.name}.${environment().suffixes.sqlServerHostname}' }
        { name: 'AZURE_SQL_DATABASE', value: sqlDatabaseName }
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

resource sqlServer 'Microsoft.Sql/servers@2023-08-01' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: 'sqlbootstrap'
    administratorLoginPassword: sqlBootstrapPassword
    version: '12.0'
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    administrators: {
      administratorType: 'ActiveDirectory'
      azureADOnlyAuthentication: true
      login: sqlAdministratorLogin
      principalType: 'Group'
      sid: sqlAdministratorObjectId
      tenantId: sqlAdministratorTenantId
    }
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  sku: { name: sqlDatabaseSkuName }
  properties: { collation: 'SQL_Latin1_General_CP1_CI_AS' }
}

output staticWebAppResourceName string = staticWebApp.name
output staticWebAppHostname string = staticWebApp.properties.defaultHostname
output functionAppResourceName string = functionApp.name
output functionAppHostname string = functionApp.properties.defaultHostName
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseResourceName string = sqlDatabase.name
