// Entry point: creates the modules, wires them together, and starts listening.

import { createApp } from "./controller.ts";

const port = Number(process.env.PORT ?? 3000);

const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console -- startup message for students
  console.log(`Enrollment server listening on http://localhost:${port}`);
});
