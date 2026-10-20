ARG PARENT_VERSION=3.0.5-node24.14.1
ARG PORT=8085

FROM defradigital/node-development:${PARENT_VERSION} AS build
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node-development:${PARENT_VERSION}

COPY --chown=node:node --chmod=755 package*.json ./
RUN npm ci
COPY --chown=node:node --chmod=755 . .
RUN NODE_ENV=production npm run build:frontend \
    && npm prune --omit=dev

FROM defradigital/node:${PARENT_VERSION} AS production
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node:${PARENT_VERSION}

ENV TZ="Europe/London"

# Add curl to template.
# CDP PLATFORM HEALTHCHECK REQUIREMENT
USER root
RUN apk add --no-cache curl
USER node

COPY --from=build /home/node/*.js ./
COPY --from=build /home/node/package*.json ./
COPY --from=build /home/node/node_modules ./node_modules/
COPY --from=build /home/node/src ./src/
COPY --from=build /home/node/.public/ ./.public/

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

ENTRYPOINT [ "node", "src" ]
