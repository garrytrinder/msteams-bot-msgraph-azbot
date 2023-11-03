@maxLength(20)
@minLength(4)
@description('Used to generate names for all resources in this file')
param resourceBaseName string

@description('Required when create Azure Bot service')
param botAadAppClientId string

@secure()
@description('Required by Bot Framework package in your bot project')
param botAadAppClientSecret string

@maxLength(42)
param botDisplayName string

param botAppDomain string
param oauthConnectionName string
param location string = resourceGroup().location

module azureBotRegistration './botRegistration/azurebot.bicep' = {
  name: 'Azure-Bot-registration'
  params: {
    resourceBaseName: resourceBaseName
    botAadAppClientId: botAadAppClientId
    botAppDomain: botAppDomain
    botDisplayName: botDisplayName
    botAddAppClientSecret: botAadAppClientSecret
    oauthConnectionName: oauthConnectionName
  }
}

module azureCosmosDB './cosmosDB/azureCosmosDB.bicep' = {
  name: 'Azure-CosmosDB'
  params: {
    accountName: resourceBaseName
    databaseName: resourceBaseName
    location: location
  }
}

output COSMOS_DB_ENDPOINT string = azureCosmosDB.outputs.COSMOS_DB_ENDPOINT
output COSMOS_DB_DATABASE_ID string = azureCosmosDB.outputs.COSMOS_DB_DATABASE_ID
output COSMOS_DB_CONTAINER_ID string = azureCosmosDB.outputs.COSMOS_DB_CONTAINER_ID
output SECRET_COSMOS_DB_AUTH_KEY string = azureCosmosDB.outputs.SECRET_COSMOS_DB_AUTH_KEY
