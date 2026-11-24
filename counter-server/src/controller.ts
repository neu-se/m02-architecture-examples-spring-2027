// Controller module: the HTTP layer.
// It validates the request, asks Auth who is calling, asks Counter for the
// count, and sends the reply. It knows Auth and Counter only by their interfaces.

import express, { type ErrorRequestHandler, type Express } from "express";
import { z } from "zod";

import type { Auth } from "./auth.ts";
import type { Counter } from "./counter.ts";

// The shape every request body must have.
const RequestBody = z.object({
  user: z.string().min(1),
  password: z.string().min(1),
});

export function createApp(auth: Auth, counter: Counter): Express {
  const app = express();
  app.use(express.json());

  app.post("/count", (req, res) => {
    const parsed = RequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    if (!auth.isAuthorized(parsed.data)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.status(200).json({ count: counter.increment() });
  });

  // express.json() throws on malformed JSON; report that as a bad request too.
  const badJson: ErrorRequestHandler = (_err, _req, res, _next) => {
    res.status(400).json({ error: "Invalid request" });
  };
  app.use(badJson);

  return app;
}
