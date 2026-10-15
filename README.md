# Register for Cattle

This project is based on the included CDP Node.js frontend template.

Role: Standalone spoke microsite.

Dependencies: @defra/lis-infra-ui-services, @defra/lis-species-cattle, @defra/lis-taxonomy-register

Port: `8085`

Primary URL path: `/cattle/register`

Run locally with `npm run dev`.
Install dependencies locally with `npm install` from this project directory.
Use `.env.example` as the generated reference file and keep `.env` for your local values.

## Required environment variables

`HUB_JWT_SECRET` has no default and must be set (it verifies the hub-issued
JWT). Set it as a secret in every deployed environment via the CDP Portal.
