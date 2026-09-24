import "dotenv/config";
import serverlessExpress from "@codegenie/serverless-express";
import type { Handler } from "aws-lambda";
import { createApp } from "./create-app";

let serverPromise: Promise<Handler> | undefined;

async function bootstrap(): Promise<Handler> {
  const app = await createApp();
  await app.init();
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

export const handler: Handler = async (event, context, callback) => {
  serverPromise ??= bootstrap().catch((error: unknown) => {
    serverPromise = undefined;
    throw error;
  });
  const server = await serverPromise;
  return server(event, context, callback);
};
