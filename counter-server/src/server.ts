// Entry point: creates the modules, wires them together, and starts listening.

import { createAuth } from "./auth.ts";
import { createApp } from "./controller.ts";
import { createCounter } from "./counter.ts";

const port = Number(process.env.PORT ?? 3000);

const app = createApp(createAuth(), createCounter());

app.listen(port, () => {
  // eslint-disable-next-line no-console -- startup message for students
  console.log(`Counter server listening on http://localhost:${port}`);
});
