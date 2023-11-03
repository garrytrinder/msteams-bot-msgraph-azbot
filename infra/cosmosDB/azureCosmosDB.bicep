// Manage Azure Cosmos DB for NoSQL resources with Bicep: Free tier Azure Cosmos DB account
// https://learn.microsoft.com/azure/cosmos-db/nosql/manage-with-bicep#free-tier-azure-cosmos-db-account

@description('Cosmos DB account name')
param accountName string

@description('Location for the Cosmos DB account.')
param location string = resourceGroup().location

@description('The name for the SQL API database')
param databaseName string

resource account 'Microsoft.DocumentDB/databaseAccounts@2022-05-15' = {
  name: toLower(accountName)
  location: location
  properties: {
    enableFreeTier: true
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
      }
    ]
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2022-05-15' = {
  parent: account
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
    options: {
      throughput: 1000
    }
  }
}

output COSMOS_DB_ENDPOINT string = account.properties.documentEndpoint
output COSMOS_DB_DATABASE_ID string = database.properties.resource.id
output COSMOS_DB_CONTAINER_ID string = accountName
#disable-next-line outputs-should-not-contain-secrets
output SECRET_COSMOS_DB_AUTH_KEY string = account.listKeys().primaryMasterKey
