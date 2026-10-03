import "dotenv/config";
import { mountApiDocs } from "./app/api-docs";
import { createApiApp } from "./app/create-app";

async function bootstrap(): Promise<void> {
  const app = await createApiApp();
  mountApiDocs(app);
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
