// Entry point: creates the modules, wires them together, and starts listening.

import { createAuth } from "./auth.ts";
import { createApp } from "./controller.ts";
import { createCounter } from "./counter.ts";
import { createFileStore } from "./store.ts";

const port = Number(process.env.PORT ?? 3000);

const store = createFileStore(process.env.DATA_FILE ?? "counter-data.json");
const app = createApp(createAuth(), createCounter(store));

app.listen(port, () => {
  // eslint-disable-next-line no-console -- startup message for students
  console.log(`Counter server listening on http://localhost:${port}`);
});
