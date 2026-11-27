# lis-apps-cattle-register

Part of the Livestock Information Service (LIS), which lets livestock keepers, owners, agents and
delegates record and manage their animals.

The cattle register microsite lets a signed-in keeper register calves born on a holding: it collects
each calf's details, dam and sire, then sends the registration. It is a spoke: it has no sign-in of
its own and is reached through the front-office and back-office hubs.

Deployed on the Core Delivery Platform (CDP). See the
[CDP portal service page](https://portal.cdp-int.defra.cloud/services/lis-apps-cattle-register) for
environments, deployments, logs and metrics.

## Architecture

```text
hub (front-office or back-office) → /holdings/<cph>/cattle/register → this app → lis-be4fe-cattle-register
```

The hubs proxy this app at its registry mount and forward the path unchanged. Assets are served at
`/assets/cattle-register`. The module list is in
[lis-hubs-infra-registry](https://github.com/DEFRA/lis-hubs-infra-registry).

- Authentication: users sign in through the hub. The hub proxy passes the signed-in user's JWT in the
  `x-lis-jwt-assertion` header, which this app verifies with `@defra/lis-hubs-infra-access`. Each
  page also checks that the user may register cattle on that holding.
- Downstream calls: the unsent registration (the "submission") and its calves are held by
  `lis-be4fe-cattle-register`, reached through the submission client from
  `@defra/lis-hubs-infra-core`. Each call carries an AWS STS service token and the `x-api-key` header
  (`CATTLE_REGISTER_API_KEY`).
- Shared packages:
  [lis-hubs-infra-access](https://github.com/DEFRA/lis-hubs-infra-access) (spoke authentication and access decisions),
  [lis-hubs-infra-core](https://github.com/DEFRA/lis-hubs-infra-core) (logging, request context, service clients),
  [lis-hubs-infra-registry](https://github.com/DEFRA/lis-hubs-infra-registry) (module paths),
  [lis-infra-ui-services](https://github.com/DEFRA/lis-infra-ui-services) (layout, error pages, shared helpers),
  [lis-species-cattle](https://github.com/DEFRA/lis-species-cattle) (cattle content),
  [lis-taxonomy-register](https://github.com/DEFRA/lis-taxonomy-register) (register taxonomy).

See [HUB-ARCHITECTURE.md](https://github.com/DEFRA/lis-dev/blob/main/HUB-ARCHITECTURE.md) for the
hub and spoke design.

### Routes

All journey routes sit under `/holdings/{cph*3}/cattle/register`.

| Path                                                   | Purpose                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `/`                                                    | Start, or resume, the holding's registration                |
| `/{submissionId}`                                      | Calves in the registration (ear tag list)                   |
| `/{submissionId}/calves/calf-details`                  | Add a calf                                                  |
| `/{submissionId}/calves/{animalId}/calf-details`       | Change a calf's details                                     |
| `/{submissionId}/calves/{animalId}/dam-details`        | Whether the calf was born to its genetic dam or a surrogate |
| `/{submissionId}/calves/{animalId}/genetic-dam`        | The genetic dam, when she calved                            |
| `/{submissionId}/calves/{animalId}/surrogate-dam`      | The surrogate dam, and the genetic dam if known             |
| `/{submissionId}/calves/{animalId}/sire-details`       | The calf's sire                                             |
| `/{submissionId}/calves/{animalId}/check-calf-details` | Check one calf's answers                                    |
| `/{submissionId}/calves/{animalId}/cancel`             | Remove a calf                                               |
| `/{submissionId}/submit`                               | Check and send the registration                             |
| `/{submissionId}/confirmation`                         | Confirmation                                                |

Also `/assets/cattle-register/{param*}` (built CSS and JavaScript) and `/health`.

## Prerequisites

- Node.js 24 (see `.nvmrc`, use `nvm use`)
- Docker with Docker Compose
- A local clone of [lis-dev](https://github.com/DEFRA/lis-dev) (recommended, see [Running with lis-dev](#running-with-lis-dev-recommended))

## Setup

```bash
nvm use
npm install
cp .env.example .env
```

`.env` is loaded when running standalone, and also by a sideloaded `npm run dev` for variables that
compose does not set. It sets `PORT=3201` (the lis-dev port), the lis-dev API key for
`lis-be4fe-cattle-register`, the public local development `HUB_JWT_SECRET` that the lis-dev hubs
use, and the fake STS values `CDP_JWT_ISSUER` and `CDP_JWT_JWKS_URI` (lis-dev's `lis-fake-sts`).

Tests use [Vitest](https://vitest.dev/). There are no tools to install beyond `npm install`.

## Running with lis-dev (recommended)

This app only works properly alongside the hubs, `lis-be4fe-cattle-register` and the fake identity
providers. [lis-dev](https://github.com/DEFRA/lis-dev) runs all of these locally with Docker
Compose and serves them behind local HTTPS hostnames. Follow its README for the one-time setup.

```bash
cd lis-dev
docker compose up -d
```

In compose this app is the `lis-apps-cattle-register` service on port 3201, and the BE4FE is
published on port 8089. To work on the app, swap its container for a local server with hot reload
while the rest of the stack stays in Docker:

```bash
.bin/sideload up apps/cattle-register
.bin/sideload restore    # when done: back to the container
```

Then open <https://front-office.lis.defra/holdings/22/001/0001/cattle/register> and sign in through
the fake identity provider.

## Running standalone

`npm run dev` runs the server on its own with the values in `.env`. Pages need the
`x-lis-jwt-assertion` header from the hub proxy, so without the hub you are redirected to sign in.
Data pages also need `lis-be4fe-cattle-register` on port 8089, because the client finds it by
environment name (`ENVIRONMENT`) and not by a URL setting.

| Script              | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Build frontend assets, then start the server with nodemon |
| `npm run dev:debug` | As `dev`, but waits for a debugger to attach              |
| `npm start`         | Production build and start                                |

### Configuration

Configuration is in `src/config/config.js`. Values marked secret must be set as secrets in the CDP
portal for every deployed environment. The logging, Redis and session cache settings follow the CDP
Node.js frontend template; see the config file for those.

| Variable                                                | Description                                                                          | Default                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `ENVIRONMENT`                                           | `local`, `docker_compose`, `dev`, `test`, `ext-test`, `perf-test` or `prod`          | `local`                                                 |
| `PORT`                                                  | Port to bind                                                                         | `8085`                                                  |
| `HUB_JWT_SECRET`                                        | Secret, required. Verifies hub JWTs. Must match the hubs                             | none                                                    |
| `HUB_JWT_AUDIENCE`                                      | Hub JWT audience                                                                     | `livestock-spokes`                                      |
| `HUB_ORIGINS`                                           | Hub origins allowed to use this spoke, and the accepted hub JWT issuers              | front-office and back-office hubs and their local ports |
| `LOG_HASH_SECRET`                                       | Secret. Key for hashing sensitive values in logs                                     | none                                                    |
| `CATTLE_REGISTER_API_KEY`                               | Secret. API key sent to `lis-be4fe-cattle-register` as `x-api-key`                   | empty                                                   |
| `CATTLE_REGISTER_API_TIMEOUT`                           | Total time allowed for a `lis-be4fe-cattle-register` response, headers and body (ms) | `5000`                                                  |
| `CATTLE_REGISTER_API_CIRCUIT_BREAKER_FAILURE_THRESHOLD` | Consecutive transport failures before the `lis-be4fe-cattle-register` circuit opens  | `5`                                                     |
| `CATTLE_REGISTER_API_CIRCUIT_BREAKER_RESET_TIMEOUT`     | Time the circuit stays open before a probe request (ms)                              | `30000`                                                 |

Service tokens need `CDP_JWT_ISSUER` and `CDP_JWT_JWKS_URI` (set by CDP, and by lis-dev for the fake
STS).

## Running tests

```bash
npm test                 # unit tests
npm run test:coverage    # with coverage; fails below 90%
npm run lint             # ESLint and Stylelint
npm run format:check     # Prettier
```

End-to-end journeys are covered by [lis-journey-tests](https://github.com/DEFRA/lis-journey-tests).

## Monitoring

- Health check: `GET /health`
- Logs and metrics: OpenSearch and Grafana dashboards per environment, linked from the
  [CDP portal service page](https://portal.cdp-int.defra.cloud/services/lis-apps-cattle-register)

## Pipelines

Build, versioning and publishing run in GitHub Actions (`.github/workflows`) using the shared
composite actions in [lis-github-actions](https://github.com/DEFRA/lis-github-actions):

- **Pull request to `main`**: validate (format, lint, test), Sonar analysis, version check
- **Push to a `feature/` or `hotfix/` branch**: prerelease build and tag
- **Merge to `main`**: release tag, then publish the container image to CDP

Versions come from git tags (SemVer).

## Branching policy

The repo uses mainline development. Branch from `main` and name the branch
`feature/LREG-<ticket>-<short-kebab-description>` or `hotfix/LREG-<ticket>-<short-kebab-description>`.
`LREG` must be uppercase, because the GitHub ruleset rejects other branch names. Rebase onto `main`
rather than merging `main` in.

## Contributing

- Follow the [Defra software development standards](https://github.com/DEFRA/software-development-standards).
- A pre-commit hook runs the security audit, format check, lint and tests. Run `npm run setup:husky` once to install it.
- Open a pull request against `main` using the PR template. CI must pass and the Sonar quality gate must be green before merge.

## Licence

Licensed under the [Open Government Licence v3](http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3).
See [LICENCE](LICENCE).
