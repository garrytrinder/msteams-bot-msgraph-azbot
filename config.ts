const config = {
  botId: process.env.BOT_ID,
  botPassword: process.env.BOT_PASSWORD,
  oauthConnectionName: process.env.OAUTH_CONNECTION_NAME,
  cosmosDbStorageOptions: {
    cosmosDbEndpoint: process.env.COSMOS_DB_ENDPOINT,
    authKey: process.env.COSMOS_DB_AUTH_KEY,
    databaseId: process.env.COSMOS_DB_DATABASE_ID,
    containerId: process.env.COSMOS_DB_CONTAINER_ID,
  },
};

export default config;
