const envVars = require('./test/test-env-vars')

process.env.AzureWebJobsStorage = envVars.AzureWebJobsStorage
process.env.INTUNE_AAD_CLIENT_ID = envVars.INTUNE_AAD_CLIENT_ID
process.env.INTUNE_AAD_CLIENT_SECRET = envVars.INTUNE_AAD_CLIENT_SECRET
process.env.INTUNE_AAD_TENANT_ID = envVars.INTUNE_AAD_TENANT_ID
