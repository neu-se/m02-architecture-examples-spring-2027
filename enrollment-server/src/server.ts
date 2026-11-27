// Entry point: creates the modules, wires them together, and starts listening.

import { createService } from "./activityService.ts";
import { createAuth } from "./authService.ts";
import { createApp } from "./controller.ts";
import { createFileRepository } from "./repository.ts";

const port = Number(process.env.PORT ?? 3000);
// Demo default only: this repository is public, so set ADMIN_PASSWORD for real use.
const adminPassword = process.env.ADMIN_PASSWORD ?? "demo-admin-password";

const repository = createFileRepository(process.env.DATA_FILE ?? "enrollment-data.json");
const app = createApp(createAuth(repository, adminPassword), createService(repository));

app.listen(port, () => {
  // eslint-disable-next-line no-console -- startup message for students
  console.log(`Enrollment server listening on http://localhost:${port}`);
});
