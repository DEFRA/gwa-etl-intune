const { app, output } = require('@azure/functions')
const fetch = require('node-fetch')
const msal = require('@azure/msal-node')

const {
  AAD_CLIENT_ID: clientId,
  AAD_CLIENT_SECRET: clientSecret,
  AAD_TENANT_ID: tenantId,
  DATA_EXTRACT_CONTAINER: storagePath,
  DATA_EXTRACT_FILE_NAME: storageFileName
} = process.env

const storageConnection = 'GWA_ETL_STORAGE_CONNECTION_STRING'

const cca = new msal.ConfidentialClientApplication({
  auth: {
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientId,
    clientSecret
  }
})

const blobOutput = output.storageBlob({
  connection: storageConnection,
  path: `${storagePath}/${storageFileName}`
})

const handler = async (request, context) => {
  try {
    const clientCredentialRequest = { scopes: ['https://graph.microsoft.com/.default'] }
    const authResult = await cca.acquireTokenByClientCredential(clientCredentialRequest)
    const accessToken = authResult.accessToken

    const select = '$select=userId,deviceName,emailAddress,phoneNumber'
    let url = `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?${select}`

    let devices = []
    const users = []
    let hasNextPage = true
    let noEmailCount = 0
    let noPhoneNumberCount = 0

    while (hasNextPage) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ConsistencyLevel: 'eventual',
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      devices = devices.concat(data.value.map(device => {
        const emailAddress = device.emailAddress ? device.emailAddress.toLowerCase() : null
        const phoneNumber = device.phoneNumber

        if (!emailAddress) {
          noEmailCount++
        }

        if (!phoneNumber) {
          noPhoneNumberCount++
        }

        let user = users.find(u => u.userId === device.userId)
        if (user) {
          if (phoneNumber) {
            user.phoneNumbers.push(phoneNumber)
          }
        } else {
          user = {
            userId: device.userId,
            emailAddress,
            phoneNumbers: phoneNumber ? [phoneNumber] : []
          }
          users.push(user)
        }

        return {
          userId: device.userId,
          emailAddress: emailAddress,
          phoneNumbers: user.phoneNumbers
        }
      }))

      url = data['@odata.nextLink']
      hasNextPage = !!url
    }

    context.log(`Data extract from Intune is complete. ${devices.length} devices have been processed.`)
    context.log(`${users.length} devices have a UserEmailAddress of which ${noPhoneNumberCount} have no PhoneNumber.`)
    context.log(`${noEmailCount} devices with no UserEmailAddress.`)

    context.extraOutputs.set(blobOutput, users)
  } catch (error) {
    context.error(error)
    throw new Error(error)
  }
}

app.timer('extractIntuneData', {
  schedule: '0 0 8 * * 0',
  extraOutputs: [blobOutput],
  handler
})

module.exports = { handler, blobOutput }
