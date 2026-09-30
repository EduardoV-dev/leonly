FROM node:24-bookworm-slim AS build

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web-app/package.json apps/web-app/package.json
COPY packages/utils/package.json packages/utils/package.json

RUN pnpm install --frozen-lockfile --filter api...

COPY apps/api apps/api
COPY packages/utils packages/utils

RUN pnpm --filter api build
RUN pnpm --filter api --prod deploy /out

FROM public.ecr.aws/lambda/nodejs:24 AS runtime

WORKDIR ${LAMBDA_TASK_ROOT}

ENV NODE_OPTIONS="--experimental-require-module"

COPY --from=build /out/ ./

CMD ["dist/lambda.handler"]
