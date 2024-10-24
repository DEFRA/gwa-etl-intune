const envVars = require('./test/test-env-vars')

process.env.AzureWebJobsStorage = envVars.AzureWebJobsStorage
process.env.AAD_CLIENT_ID = envVars.AAD_CLIENT_ID
process.env.AAD_CLIENT_SECRET = envVars.AAD_CLIENT_SECRET
process.env.AAD_TENANT_ID = envVars.AAD_TENANT_ID