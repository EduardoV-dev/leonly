import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  getHealth(): Readonly<{ status: "ok" }> {
    return { status: "ok" };
  }
}
