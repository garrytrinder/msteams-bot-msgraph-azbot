# Teams Toolkit for Visual Studio Code Basic Bot template with SSO, Azure Bot Service and Azure Cosmos DB for local development

This sample extends the out of the box Basic Bot project template in Teams Toolkit for Visual Studio Code and makes the following changes\enhancements:

- Uses `Azure Bot Service` free-tier for local development loop instead of [Microsoft Bot Framework](https://dev.botframework.com/) bot registration
- Uses `Azure Cosmos DB` free-tier account in local development loop to [read/write conversation state to storage](https://learn.microsoft.com/azure/bot-service/bot-builder-howto-v4-storage?view=azure-bot-service-4.0&tabs=javascript#using-cosmos-db) instead of `MemoryStorage`. [Why Azure Cosmos DB](#why-azure-cosmos-db)?
- Uses `aadApp/create` and `aadApp/update` tasks to create Microsoft Entra ID app registration for Azure Bot Service with app registration manifest in local development
- Uses `arm/deploy` task to update Azure Bot Service during local development, updates messaging endpoint and OAuth connection setting
- Uses [Azure Bot Service Token Service](https://learn.microsoft.com/azure/bot-service/bot-builder-concept-authentication?view=azure-bot-service-4.0#about-the-bot-framework-token-service) to simplify authentication flow
- Uses [Dialogs library](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-concept-dialog) to obtain access token for Microsoft Graph using OAuthPrompt
- Uses [TeamsSSOTokenExchangeMiddleware]() to handle deduplication in the token exchange step
- Uses linting (ESLint) and formatting (Prettier) rules for code consistency, configured using [GTS](https://github.com/google/gts) (Google TypeScript Style)
- Updated project dependencies to latest major versions (as of November '23)

> ℹ️ This sample goes as far as obtaining a valid access token that can be used to call Microsoft Graph API. This is intentional leaving it open for you as a developer to choose your own path and leave this as un-opinionated as possible.

## Prerequisites

- Teams Toolkit for Visual Studio Code
- Microsoft 365 tenant with [uploading custom apps enabled](https://learn.microsoft.com/microsoftteams/platform/m365-apps/prerequisites#prepare-a-developer-tenant-for-testing)
- Account with access to an active Azure subscription and has permissions to create a resource group

## Get started

- Clone repo
- Open repo in VSCode
- Take a copy of all the files in `env` folder and remove `.sample` from the copies, for example, `.env.local.sample` becomes `.env.local`
- Press `F5`, follow the sign in prompts

> ℹ️ The `arm/deploy` task generates a prompt that you need to confirm to provision or update the Azure Bot Service in Azure. The Azure Bot Service and Azure Cosmos DB are provisioned using the free tiers, so no cost will be incurred.
>
> ⚠️ If you already have an Azure Cosmos DB account that uses the free-tier in your target Azure subscription the provisioning will fail. There is a limitation on one free tier account per Azure subscription.

## Test the bot

Send a message to the bot and an Adaptive Card will be returned with the access token to call Microsoft Graph.

![Screenshot of sign in ](./assets/bot-signin.png)

![Screenshot of Microsoft Entra consent](./assets/bot-consent.png)

![Screenshot of token for Microsoft Graph rendered in an Adaptive Card](./assets/bot-token.png)

## Manage conversation state

To manage the conversation state saved to Azure Cosmos DB, use the web based [Azure Cosmos DB Explorer](https://cosmos.azure.com/).

![Screenshot of conversation state entry in Azure Cosmos DB Explorer](./assets/cosmos-db-explorer.png)

## What happens when you press F5

The following sequence diagram shows the interacts between components when you start a debug session in VSCode.

```mermaid
sequenceDiagram
    actor Developer
    participant VSCode
    participant teamsfx
    participant DevTunnel
    participant TDP
    participant Azure
    participant npm
    participant Browser

    activate VSCode
    activate TDP
    activate Azure
    
    Developer->>VSCode:startDebug

    rect rgb(240,240,240)
        VSCode->>teamsfx:Validate prerequisites (prerequisites, portOccupancy)
        activate teamsfx
        teamsfx-->>VSCode: result
        deactivate teamsfx
    end

    rect rgb(240,240,240)
        note right of VSCode: Start DevTunnel
        VSCode->>teamsfx:Start local tunnel (type, port, protocol, access, endpoint, domain, env)
        activate teamsfx
        teamsfx->>DevTunnel:start(port, protocol, access)
        activate DevTunnel
        DevTunnel-->>teamsfx:tunnel (endpoint, domain)
        teamsfx->>teamsfx:write to env file (endpoint, domain)
        teamsfx-->>VSCode: output
        deactivate teamsfx
    end

    rect rgb(240,240,240)
        note right of VSCode: Provision app
        VSCode->>teamsfx:Provision (teamsapp.local.yml)
        activate teamsfx
        rect rgb(200, 150, 255)
            note right of teamsfx: Create app in Teams Developer Portal (TDP)
            teamsfx->>TDP: teamsApp/create (name)
            TDP-->>teamsfx: response (teamsAppId)
            teamsfx->>teamsfx:write to env file (teamsAppId)
        end
        rect rgb(191, 223, 255)
            note right of teamsfx: Provision Azure resources
            teamsfx->>Azure: aadApp/create (name, generateClientSecret, signInAudience)
            Azure-->>teamsfx: response (clientId, clientSecret, objectId, tenantId, authority, authorityHost)
            teamsfx->>teamsfx:write to env file (clientId, objectId, tenantId, authority, authorityHost)
            teamsfx->>teamsfx:write to env user file (clientSecret)
            teamsfx->>Azure: aadApp/update (manifest)
            Azure-->>teamsfx: response (manifest)
            teamsfx->>teamsfx: update file (outputFilePath, manifest)
            teamsfx->>Azure: arm/deploy (subscriptionId, resourceGroupName, templates)
            Azure-->>teamsfx: result (202 Accepted)
        end
        rect rgb(200, 150, 255)
            note right of teamsfx: Package and upload Teams app
            teamsfx->>TDP: teamsApp/validateManifest (manifest)
            TDP-->>teamsfx: result
            teamsfx->>teamsfx: teamsApp/zipAppPackage (manifestPath, outputZipPath, outputJsonPath)
            teamsfx->>TDP:teamsApp/validateAppPackage (appPackagePath)
            TDP-->>teamsfx: result
            teamsfx->>TDP:teamsApp/update (appPackagePath)
            TDP-->>teamsfx: result
        end
            teamsfx-->>VSCode: output
        deactivate teamsfx
    end

    rect rgb(240,240,240)
        note right of Developer: Start local dev server
        VSCode->>teamsfx:Deploy (teamsapp.local.yml)
        activate teamsfx
        teamsfx->>npm:npm install
        activate npm
        npm-->>teamsfx:result
        deactivate npm
        teamsfx->>teamsfx: file/createOrUpdateEnvironmentFile (target, envs)
        teamsfx-->>VSCode: output
        deactivate teamsfx
        VSCode->>npm: npm run dev:teamsfx
        activate npm
        npm-->>VSCode: output
        VSCode-->>Developer: nodemon task
    end

    VSCode->>VSCode: Attach to debugger
    VSCode->>Browser: Launch (sideloading URL)
    activate Browser
    Browser-->>VSCode: result
    Browser-->>Developer: Microsoft Teams sideloading UI
 
    deactivate DevTunnel
    deactivate VSCode
    deactivate TDP
    deactivate Azure
    deactivate npm
    deactivate Browser
```

## System context diagram

```mermaid
C4Context
    title System context diagram for Microsoft Teams app that can access data in Microsoft 365 via Microsoft Graph

    Person(user,"Microsoft 365 User")
    System_Ext(teams_client, "Microsoft Teams Client", "Provides access to Microsoft Teams platform")
    System(app, "Microsoft Teams app", "Provides functionality to extend Microsoft Teams")
    System_Ext(graph, "Microsoft Graph API", "Provides access to Microsoft 365 data")
    System_Ext(entra,"Microsoft Entra ID", "Registers app on Microsoft cloud")

    Rel(user, teams_client, "Uses")
    Rel(teams_client, app, "Uses")
    Rel(app, entra, "Uses")
    Rel(app, graph, "Uses")
```

## Container diagram

```mermaid
C4Container
    title Container context diagram for Microsoft Teams app that can access data in Microsoft 365 via Microsoft Graph

    Person(user,"Microsoft 365 User")
    System_Ext(teams_client, "Microsoft Teams Client", "Provides access to Microsoft Teams platform")
    System_Ext(entra,"Microsoft Entra ID", "Registers app on Microsoft cloud")
    System_Ext(graph, "Microsoft Graph API","Provides access to Microsoft 365 data")

    System_Boundary(app, "Microsoft Teams app") {
        Container(teams_app, "Microsoft Teams app", "Microsoft Teams App Package", "Extends Microsoft Teams with an app containing a bot")
        Container(bot, "Bot Service", "Azure Bot Service", "Broker between between Microsoft Teams and bot logic")
        Container(web_app, "Web Application", "nodejs, restify", "Provides the bot logic")
        ContainerDb(db,"Database","Azure Cosmos DB","Stores bot state")
    }

    Rel(web_app,graph,"Uses")
    Rel(user,teams_client,"Uses")
    Rel(teams_client,teams_app,"Is extended by")
    Rel(teams_app,entra,"Uses for SSO")
    Rel(web_app,bot,"Sends/receives activities from")
    Rel(web_app,entra,"Authenticates users with")
    Rel(web_app,db,"Reads/writes to")
```
## Why Azure Cosmos DB?

`MemoryStorage` is commonly used to provide functionality to save state during local development. Unfortunately, using `MemoryStorage` has drawbacks such as when the server is restarted, for example, when the developer makes a code change, the current state is lost. When using state, it is desirable to have data persist after making code changes so that the developer does not have to start over again.

[Write directly to storage](https://learn.microsoft.com/azure/bot-service/bot-builder-howto-v4-storage?view=azure-bot-service-4.0&tabs=javascript) article suggests three ways to write to storage:

1. MemoryStorage
2. Azure Cosmos DB
3. Azure Blob Storage

[Add code to enable SSO in your bot app](https://learn.microsoft.com/microsoftteams/platform/bots/how-to/authentication/bot-sso-code?tabs=js1%2Cjs2%2Ccs3%2Cjs4%2Cjs5&pivots=bot-app#add-code-to-request-a-token) article provides guidance and recommends that developers use the 
[TeamsSSOTokenExchangeMiddleware](https://learn.microsoft.com/javascript/api/botbuilder/teamsssotokenexchangemiddleware?view=botbuilder-ts-latest) class to handle deduplication in the token exchange step.

However, the `TeamsSSOTokenExchangeMiddleware` class only supports `MemoryStorage` and `Azure Cosmos DB`, so we cannot use `Azure Blob Storage`.

This leaves two options:

1. Stand-up an Azure Cosmos DB resource in Azure using the free-tier
2. Implement emulated Azure Cosmos DB resource [locally using Docker](https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-develop-emulator?tabs=docker-linux%2Ccsharp&pivots=api-nosql)

Option one provides the easiest implementation, the project already provisions an Azure Bot Service for local development so it would just be a case of updating the existing bicep files to add this in. The only drawback is that you can only have one free-tier resource per subscription, so developers would need to keep this in mind if they had multiple projects that used this approach using the same Azure subscription. If that would be the case then developers would need to provide the resource IDs in the environment files and ensure that table names do not conflict.

Option two does not require any Azure resources to be stood up, but adds additional requirements such as Docker and would consume more local resources. Also depending on which operating system you use the setup instructions are different and would need to be performed manually.
