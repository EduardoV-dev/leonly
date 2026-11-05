# Send Email Through A Validated Worker Boundary

Apply the [worker rule](../references/backend-worker-structure.md) with general and TypeScript rules.
This example assumes an API produces email jobs and a worker consumes them. The layout and
`@workspace/contracts` import are illustrative placeholders: use the project's established shared-contract
package, public exports, application roots, and supported import resolution. Zod snippets use Zod 4.
Lambda/SQS is one trigger example, not a required worker platform.

## Ownership Layout

```text
packages/contracts/src/
├── index.ts
└── jobs/
    └── send-email.schema.ts

apps/workers/src/
├── constants/
│   └── environment-variables.ts
├── lib/
│   ├── email.ts
│   └── logger.ts
└── functions/
    └── send-email/
        ├── handler.ts
        ├── events/
        │   ├── sqs-handler.ts
        │   └── sqs-handler.test.ts
        ├── services/
        │   ├── processor.ts
        │   └── processor.test.ts
        └── tests/
            └── handler.test.ts
```

Omit groups that have no responsibility; this worker needs no `repositories/` forwarding layer.
If only this function consumes the schema, place it in the function's `events/` group instead.

## Shared Message Contract

`jobs/send-email.schema.ts` defines runtime validation and the inferred message type:

```ts
import { z } from "zod";

export const sendEmailSchema = z.object({
  jobId: z.uuid(),
  recipient: z.email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export type SendEmailJob = z.infer<typeof sendEmailSchema>;
```

This contract deliberately strips unknown fields. Choose strict or loose handling when the established
contract requires it. Export both declarations through the contracts package's public entry point:

```ts
export {
  type SendEmailJob,
  sendEmailSchema,
} from "./jobs/send-email.schema";
```

The producer can call `sendEmailSchema.parse(job)` before publication. The consumer must still validate
each message at its own ingress boundary.

## Business Operation

`services/processor.ts` receives a validated message, without Lambda events or batch responses:

```ts
import type { SendEmailJob } from "@workspace/contracts";
import { emailService } from "../../../lib/email";

export async function processSendEmail(job: SendEmailJob): Promise<void> {
  await emailService.send({
    to: job.recipient,
    subject: job.subject,
    body: job.body,
  });
}
```

`emailService` is an application-owned configured email adapter, initialized in `lib/email.ts` when its
lifecycle supports reuse. Its implementation and the configured structured logger in `lib/logger.ts`
are project-specific and omitted. Tests can replace the external email boundary without invoking Lambda.

## Standard SQS Batch Adapter

`events/sqs-handler.ts` decodes and validates each record before business processing:

```ts
import { sendEmailSchema } from "@workspace/contracts";
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import { logger } from "../../../lib/logger";
import { processSendEmail } from "../services/processor";

export async function processSendEmailBatch(
  event: SQSEvent,
): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records) {
    try {
      const decoded: unknown = JSON.parse(record.body);
      const job = sendEmailSchema.parse(decoded);

      await processSendEmail(job);
    } catch {
      logger.error(
        {
          event: "email_job_failed",
          messageId: record.messageId,
        },
        "Email job failed",
      );

      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  return { batchItemFailures };
}
```

Malformed JSON and invalid payloads fail before the processor runs. The processor receives the parsed
result, so stripped fields never reach it. Logs include the message ID without recipient or body.
The catch maps failures to retries rather than silently treating them as success.

## Thin Entry Point

`handler.ts` exposes only the Lambda entry point:

```ts
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import { processSendEmailBatch } from "./events/sqs-handler";

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  return processSendEmailBatch(event);
}
```

Enable `ReportBatchItemFailures` on the standard SQS event-source mapping through the established
infrastructure tool. This continue-on-failure loop is not a FIFO implementation: for FIFO, stop at the
first failure and return failed and unprocessed message IDs to preserve ordering.

## Verification Requirements And Delivery Limit

- Test valid messages through the entry point and assert the expected external email effect.
- Test malformed JSON and schema-invalid payloads: no email effect, failed record IDs returned.
- Test parsed-value handoff, including the deliberate removal of unknown fields.
- Test an email-provider rejection and a mixed standard-queue batch: only failed IDs are returned,
  and valid records still complete. Test the processor independently of Lambda.
- Verify event-source configuration and, when applicable, FIFO stop/ordering behavior. Verify the
  production duplicate-delivery strategy separately, including retries after an external effect succeeds.

This example illustrates validation and failure isolation, not exactly-once email delivery. Schema
validation does not provide idempotency; production delivery still needs a durable duplicate-delivery
strategy that accounts for the provider accepting an email before the worker records completion.
