const testEnvVars = require('../test-env-vars')

describe('extractIntuneData', () => {
  let context
  let request
  let acquireTokenMock
  const accessTokenValue = 'access-token'
  const fetchError = 'Fetch error'
  let fetch
  let msal
  let handler
  let blobOutput

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    fetch = require('node-fetch')
    jest.mock('node-fetch')
    msal = require('@azure/msal-node')
    jest.mock('@azure/msal-node')

    context = {
      log: jest.fn(),
      error: jest.fn(),
      extraOutputs: {
        set: jest.fn()
      }
    }

    request = {
      query: {},
      body: {}
    }

    acquireTokenMock = jest.fn().mockResolvedValueOnce({ accessToken: accessTokenValue })
    msal.ConfidentialClientApplication.mockImplementation(() => {
      return { acquireTokenByClientCredential: acquireTokenMock }
    })

    handler = require('../../src/functions/extract-intune-data').handler
    blobOutput = require('../../src/functions/extract-intune-data').blobOutput
  })

  test('MSAL client is correctly created on module import', async () => {
    expect(msal.ConfidentialClientApplication).toHaveBeenCalledTimes(1)
    expect(msal.ConfidentialClientApplication).toHaveBeenCalledWith({
      auth: {
        authority: `https://login.microsoftonline.com/${testEnvVars.INTUNE_AAD_TENANT_ID}`,
        clientId: testEnvVars.INTUNE_AAD_CLIENT_ID,
        clientSecret: testEnvVars.INTUNE_AAD_CLIENT_SECRET
      }
    })
  })

  test('handles fetch error', async () => {
    fetch.mockRejectedValueOnce(new Error(fetchError))

    await expect(handler(request, context)).rejects.toThrow(fetchError)
    expect(context.error).toHaveBeenCalledWith(new Error(fetchError))
  })

  test('handles multiple devices', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        value: [
          { userId: 'user1', deviceName: 'device1', emailAddress: 'user1@example.com', phoneNumber: '1234567890' },
          { userId: 'user2', deviceName: 'device2', emailAddress: 'user2@example.com', phoneNumber: null },
          { userId: 'user3', deviceName: 'device3', emailAddress: null, phoneNumber: '0987654321' }
        ],
        '@odata.nextLink': null
      })
    })

    await handler(request, context)

    expect(context.log).toHaveBeenCalledWith('Data extract from Intune is complete. 3 devices have been processed.')
    expect(context.log).toHaveBeenCalledWith('There are 3 unique users.')
    expect(context.log).toHaveBeenCalledWith('1 devices with no UserEmailAddress.')
    expect(context.extraOutputs.set).toHaveBeenCalledWith(expect.anything(), [
      { emailAddress: 'user1@example.com', phoneNumbers: ['1234567890'] },
      { emailAddress: 'user2@example.com', phoneNumbers: [] },
      { emailAddress: null, phoneNumbers: ['0987654321'] }
    ])
  })

  test('handles multiple phone numbers', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        value: [
          { userId: 'user1', deviceName: 'device1', emailAddress: 'user1@example.com', phoneNumber: '1234567890' },
          { userId: 'user1', deviceName: 'device2', emailAddress: 'user1@example.com', phoneNumber: '0987654321' }
        ],
        '@odata.nextLink': null
      })
    })

    await handler(request, context)

    expect(context.log).toHaveBeenCalledWith('Data extract from Intune is complete. 2 devices have been processed.')
    expect(context.extraOutputs.set).toHaveBeenCalledWith(expect.anything(), [
      { emailAddress: 'user1@example.com', phoneNumbers: ['1234567890', '0987654321'] }
    ])
  })

  test('handles devices with no email addresses', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        value: [
          { userId: 'user1', deviceName: 'device1', emailAddress: null, phoneNumber: '1234567890' }
        ],
        '@odata.nextLink': null
      })
    })

    await handler(request, context)

    expect(context.log).toHaveBeenCalledWith('Data extract from Intune is complete. 1 devices have been processed.')
    expect(context.log).toHaveBeenCalledWith('There are 1 unique users.')
    expect(context.log).toHaveBeenCalledWith('1 devices with no UserEmailAddress.')
    expect(context.extraOutputs.set).toHaveBeenCalledWith(expect.anything(), [
      { emailAddress: null, phoneNumbers: ['1234567890'] }
    ])
  })

  test('handles devices with no phone numbers', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        value: [
          { userId: 'user1', deviceName: 'device1', emailAddress: 'user1@example.com', phoneNumber: null }
        ],
        '@odata.nextLink': null
      })
    })

    await handler(request, context)

    expect(context.log).toHaveBeenCalledWith('Data extract from Intune is complete. 1 devices have been processed.')
    expect(context.log).toHaveBeenCalledWith('There are 1 unique users.')
    expect(context.log).toHaveBeenCalledWith('0 devices with no UserEmailAddress.')
    expect(context.extraOutputs.set).toHaveBeenCalledWith(expect.anything(), [
      { emailAddress: 'user1@example.com', phoneNumbers: [] }
    ])
  })

  test('successful data extraction with multiple devices', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        value: [
          { userId: '1', deviceName: 'Device1', emailAddress: 'user1@example.com', phoneNumber: '123' },
          { userId: '2', deviceName: 'Device2', emailAddress: 'user2@example.com', phoneNumber: '456' }
        ]
      })
    })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          value: []
        })
      })

    await handler(request, context)

    expect(context.log).toHaveBeenCalledWith('Data extract from Intune is complete. 2 devices have been processed.')
    expect(context.extraOutputs.set).toHaveBeenCalledWith(blobOutput, [
      { emailAddress: 'user1@example.com', phoneNumbers: ['123'] },
      { emailAddress: 'user2@example.com', phoneNumbers: ['456'] }
    ])
  })

  test('handles pagination correctly', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        value: [
          { userId: '1', deviceName: 'Device1', emailAddress: 'user1@example.com', phoneNumber: '123' }
        ],
        '@odata.nextLink': 'nextPageLink'
      })
    })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          value: [
            { userId: '2', deviceName: 'Device2', emailAddress: 'user2@example.com', phoneNumber: '456' }
          ],
          '@odata.nextLink': null
        })
      })

    await handler(request, context)

    expect(context.log).toHaveBeenCalledWith('Data extract from Intune is complete. 2 devices have been processed.')
    expect(context.extraOutputs.set).toHaveBeenCalledWith(blobOutput, [
      { emailAddress: 'user1@example.com', phoneNumbers: ['123'] },
      { emailAddress: 'user2@example.com', phoneNumbers: ['456'] }
    ])
  })

  test('handles empty device list', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        value: [],
        '@odata.nextLink': null
      })
    })

    await handler(request, context)

    expect(context.log).toHaveBeenCalledWith('Data extract from Intune is complete. 0 devices have been processed.')
    expect(context.extraOutputs.set).toHaveBeenCalledWith(blobOutput, [])
  })
})
