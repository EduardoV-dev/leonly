import "dotenv/config";
import { mountApiDocs } from "./app/api-docs/api-docs";
import { createApiApp } from "./app/create-app/create-app";
import { ENVIRONMENT_VARIABLES } from "./common/configs/environment-variables.config";

async function bootstrap(): Promise<void> {
  const app = await createApiApp();
  mountApiDocs(app);
  const port = Number(ENVIRONMENT_VARIABLES.PORT);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
