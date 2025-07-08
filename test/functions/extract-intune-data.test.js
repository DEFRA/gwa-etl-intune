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
          { userId: 'user1', deviceName: 'device1', emailAddress: 'user1@example.com', phoneNumber: '07123456789' },
          { userId: 'user2', deviceName: 'device2', emailAddress: 'user2@example.com', phoneNumber: null },
          { userId: 'user3', deviceName: 'device3', emailAddress: null, phoneNumber: '07123456780' }
        ],
        '@odata.nextLink': null
      })
    })

    await handler(request, context)

    expect(context.log).toHaveBeenCalledWith('Data extract from Intune is complete. 3 devices have been processed.')
    expect(context.log).toHaveBeenCalledWith('There are 3 unique users.')
    expect(context.log).toHaveBeenCalledWith('1 devices with no UserEmailAddress.')
    expect(context.extraOutputs.set).toHaveBeenCalledWith(expect.anything(), [
      { emailAddress: 'user1@example.com', phoneNumbers: ['07123456789'] },
      { emailAddress: 'user2@example.com', phoneNumbers: [] },
      { emailAddress: null, phoneNumbers: ['07123456780'] }
    ])
  })

  test('handles multiple phone numbers', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        value: [
          { userId: 'user1', deviceName: 'device1', emailAddress: 'user1@example.com', phoneNumber: '07123456789' },
          { userId: 'user1', deviceName: 'device2', emailAddress: 'user1@example.com', phoneNumber: '07123456780' }
        ],
        '@odata.nextLink': null
      })
    })

    await handler(request, context)

    expect(context.log).toHaveBeenCalledWith('Data extract from Intune is complete. 2 devices have been processed.')
    expect(context.extraOutputs.set).toHaveBeenCalledWith(expect.anything(), [
      { emailAddress: 'user1@example.com', phoneNumbers: ['07123456789', '07123456780'] }
    ])
  })

  test('handles devices with no email addresses', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        value: [
          { userId: 'user1', deviceName: 'device1', emailAddress: null, phoneNumber: '07123456789' }
        ],
        '@odata.nextLink': null
      })
    })

    await handler(request, context)

    expect(context.log).toHaveBeenCalledWith('Data extract from Intune is complete. 1 devices have been processed.')
    expect(context.log).toHaveBeenCalledWith('There are 1 unique users.')
    expect(context.log).toHaveBeenCalledWith('1 devices with no UserEmailAddress.')
    expect(context.extraOutputs.set).toHaveBeenCalledWith(expect.anything(), [
      { emailAddress: null, phoneNumbers: ['07123456789'] }
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
          { userId: '1', deviceName: 'Device1', emailAddress: 'user1@example.com', phoneNumber: '07123456789' },
          { userId: '2', deviceName: 'Device2', emailAddress: 'user2@example.com', phoneNumber: '07123456780' }
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
      { emailAddress: 'user1@example.com', phoneNumbers: ['07123456789'] },
      { emailAddress: 'user2@example.com', phoneNumbers: ['07123456780'] }
    ])
  })

  test('handles pagination correctly', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        value: [
          { userId: '1', deviceName: 'Device1', emailAddress: 'user1@example.com', phoneNumber: '07123456789' }
        ],
        '@odata.nextLink': 'nextPageLink'
      })
    })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          value: [
            { userId: '2', deviceName: 'Device2', emailAddress: 'user2@example.com', phoneNumber: '07123456780' }
          ],
          '@odata.nextLink': null
        })
      })

    await handler(request, context)

    expect(context.log).toHaveBeenCalledWith('Data extract from Intune is complete. 2 devices have been processed.')
    expect(context.extraOutputs.set).toHaveBeenCalledWith(blobOutput, [
      { emailAddress: 'user1@example.com', phoneNumbers: ['07123456789'] },
      { emailAddress: 'user2@example.com', phoneNumbers: ['07123456780'] }
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

  test('only valid UK mobile numbers are included in phoneNumbers', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        value: [
          { userId: 'user1', deviceName: 'device1', emailAddress: 'user1@example.com', phoneNumber: '07123456789' }, // valid UK mobile
          { userId: 'user2', deviceName: 'device2', emailAddress: 'user2@example.com', phoneNumber: '+447912345678' }, // valid UK mobile
          { userId: 'user3', deviceName: 'device3', emailAddress: 'user3@example.com', phoneNumber: '02079460000' }, // not a mobile
          { userId: 'user4', deviceName: 'device4', emailAddress: 'user4@example.com', phoneNumber: null }, // no number
          { userId: 'user5', deviceName: 'device5', emailAddress: 'user5@example.com', phoneNumber: '07987654321' }, // valid UK mobile
          { userId: 'user6', deviceName: 'device6', emailAddress: null, phoneNumber: '07123456789' }, // no email, valid mobile
          { userId: 'user7', deviceName: 'device7', emailAddress: 'user7@example.com', phoneNumber: '00000000000' } // not a mobile
        ],
        '@odata.nextLink': null
      })
    })

    await handler(request, context)

    expect(context.extraOutputs.set).toHaveBeenCalledWith(expect.anything(), [
      { emailAddress: 'user1@example.com', phoneNumbers: ['07123456789'] },
      { emailAddress: 'user2@example.com', phoneNumbers: ['+447912345678'] },
      { emailAddress: 'user3@example.com', phoneNumbers: [] },
      { emailAddress: 'user4@example.com', phoneNumbers: [] },
      { emailAddress: 'user5@example.com', phoneNumbers: ['07987654321'] },
      { emailAddress: null, phoneNumbers: ['07123456789'] },
      { emailAddress: 'user7@example.com', phoneNumbers: [] }
    ])
  })
})
