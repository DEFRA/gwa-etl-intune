# gwp-etl-intune


[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)\
[![Build and Deploy Production](https://github.com/DEFRA/gwa-etl-intune/actions/workflows/build-and-deploy-production.yml/badge.svg)](https://github.com/DEFRA/gwa-etl-intune/actions/workflows/build-and-deploy-production.yml)
[![Build and Deploy Staging](https://github.com/DEFRA/gwa-etl-intune/actions/workflows/build-and-deploy-staging.yml/badge.svg)](https://github.com/DEFRA/gwa-etl-intune/actions/workflows/build-and-deploy-staging.yml)\
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_gwa-etl-intune&metric=coverage)](https://sonarcloud.io/dashboard?id=DEFRA_gwa-etl-intune)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_gwa-etl-intune&metric=sqale_index)](https://sonarcloud.io/dashboard?id=DEFRA_gwa-etl-intune)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_gwa-etl-intune&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=DEFRA_gwa-etl-intune)\
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_gwa-etl-intune&metric=security_rating)](https://sonarcloud.io/dashboard?id=DEFRA_gwa-etl-intune)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_gwa-etl-intune&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=DEFRA_gwa-etl-intune)
[![Known Vulnerabilities](https://snyk.io/test/github/defra/gwa-etl-intune/badge.svg)](https://snyk.io/test/github/defra/gwa-etl-intune)

> An [Azure Function app](https://azure.microsoft.com/en-gb/services/functions/)
> for loading various sources of devices data into Blob Storage.

The app extracts data from
[Intune](https://learn.microsoft.com/en-us/graph/api/intune-devices-manageddevice-list?view=graph-rest-1.0)
via [Microsoft Graph](https://docs.microsoft.com/en-us/graph/overview).

## Functions

The app is made up of a number of one function

* [extract-intune-data](src/functions/README.md)

## Development

The best place to start for an overall view of how JavaScript Functions work in
Azure is the
[Azure Functions JavaScript developer guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2).
From there follow the appropriate link to the documentation specific to
your preferred development environment i.e.
[Visual Studio Code](https://docs.microsoft.com/en-us/azure/azure-functions/create-first-function-vs-code-node)
or
[command line](https://docs.microsoft.com/en-us/azure/azure-functions/create-first-function-cli-node?tabs=azure-cli%2Cbrowser).

The documentation within this repo assumes the `command line` setup has been
completed, specifically for
[Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli).

## Running Locally

To start the function app run `func start` or `npm run start` (which just runs
`func start`).

### Prerequisites

The app uses Azure Storage blobs. When working locally
[Azurite](https://github.com/Azure/Azurite) can be used to emulate storage.
Follow the
[instructions](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azurite)
for your preferred installation option.

The app uses `local.settings.json` for local development.
[.local.settings.json](.local.settings.json) can be used as the
basis as it contains all required env vars with the exception of secrets which
have been removed. The connection string for Azurite is included as this is not
a secret.

## License

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT
LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and
applications when using this information.

> Contains public sector information licensed under the Open Government license
> v3

### About the license

The Open Government Licence (OGL) was developed by the Controller of Her
Majesty's Stationery Office (HMSO) to enable information providers in the
public sector to license the use and re-use of their information under a common
open licence.

It is designed to encourage use and re-use of information freely and flexibly,
with only a few conditions.
