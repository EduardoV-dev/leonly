FROM node:24-bookworm-slim AS build

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/workers/package.json apps/workers/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/database/package.json packages/database/package.json

RUN pnpm install --frozen-lockfile --filter workers...

COPY apps/workers apps/workers
COPY packages/utils packages/utils
COPY packages/database packages/database

RUN pnpm --filter workers build
RUN pnpm --filter workers --prod deploy /out

FROM public.ecr.aws/lambda/nodejs:24 AS runtime

WORKDIR ${LAMBDA_TASK_ROOT}

ENV NODE_OPTIONS="--experimental-require-module"

COPY --from=build /out/ ./

RUN node -e 'require("sharp")({ create: { width: 1, height: 1, channels: 3, background: "white" } }).webp().toBuffer().catch(() => process.exit(1))'

CMD ["dist/functions/image-processing/handler.handler"]
