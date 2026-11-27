// Controller module: the HTTP layer.
// It validates the request, asks Auth who is calling, asks Counter for the
// count, and sends the reply. It knows Auth and Counter only by their interfaces.

import express, { type ErrorRequestHandler, type Express } from "express";
import { z } from "zod";

import type { Auth, Counter, Credentials } from "./interfaces.ts";

export function createApp(authService: Auth, counterService: Counter): Express {
  const app = express();
  app.use(express.json());

  app.post("/count", async (req, res) => {
    const credentials = validatedCredentials(req.body);
    if (credentials === undefined) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    if (!authService.isAuthorized(credentials)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.status(200).json({ count: await counterService.increment() });
  });

  app.use(badJson);

  return app;
}

// The shape every request body must have.
const RequestBody = z.object({
  user: z.string().min(1),
  password: z.string().min(1),
});

// Returns the credentials if the body has the right shape, else undefined.
function validatedCredentials(body: unknown): Credentials | undefined {
  const parsed = RequestBody.safeParse(body);
  return parsed.success ? parsed.data : undefined;
}

// express.json() throws on malformed JSON; report that as a bad request too.
const badJson: ErrorRequestHandler = (_err, _req, res, _next) => {
  res.status(400).json({ error: "Invalid request" });
};
