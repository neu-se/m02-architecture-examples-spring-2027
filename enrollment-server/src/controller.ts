// Controller module: the HTTP layer.
// It validates each request, asks Auth who is calling, asks the Service to do
// the work, and turns the Service's result into a status code. It knows Auth
// and Service only by their interfaces.

import express, { type ErrorRequestHandler, type Express, type Response } from "express";
import { z } from "zod";

import type { Auth, Result, Service } from "./interfaces.ts";

export function createApp(authService: Auth, activityService: Service): Express {
  const app = express();
  app.use(express.json());

  // Anyone may create a student; the new login and password are in the body.
  app.post("/students", async (req, res) => {
    const body = validated(Credentials, req.body);
    if (!body) return void res.status(400).json({ error: "Invalid request" });

    const hash = await authService.hashPassword(body.password);
    reply(res, 201, await activityService.createStudent(body.user, hash));
  });

  // Only the admin may create an activity.
  app.post("/activities", async (req, res) => {
    const body = validated(NewActivity, req.body);
    if (!body) return void res.status(400).json({ error: "Invalid request" });

    const caller = await authService.authenticate(body);
    if (!caller) return void res.status(401).json({ error: "Unauthorized" });
    if (!caller.isAdmin) return void res.status(403).json({ error: "Forbidden" });

    reply(res, 201, await activityService.createActivity(body.name));
  });

  // A student signs up or drops, only for themself.
  function studentRoute(
    path: string,
    act: (student: string, activity: string) => Promise<Result<string>>,
  ) {
    app.post<{ name: string }>(path, async (req, res) => {
      const body = validated(Credentials, req.body);
      if (!body) return void res.status(400).json({ error: "Invalid request" });

      const caller = await authService.authenticate(body);
      if (!caller) return void res.status(401).json({ error: "Unauthorized" });

      reply(res, 200, await act(caller.name, req.params.name));
    });
  }
  studentRoute("/activities/:name/signups", (s, a) => activityService.signUp(s, a));
  studentRoute("/activities/:name/drops", (s, a) => activityService.drop(s, a));

  app.use(badRequest);

  return app;
}

// ---- Private helpers -------------------------------------------------------

// The shapes of the request bodies.
const Credentials = z.object({ user: z.string().min(1), password: z.string().min(1) });
const NewActivity = Credentials.extend({ name: z.string().min(1) });

// Returns the body if it has the right shape, else undefined.
function validated<T>(schema: z.ZodType<T>, body: unknown): T | undefined {
  const parsed = schema.safeParse(body);
  return parsed.success ? parsed.data : undefined;
}

// express.json() throws on malformed JSON, which is the caller's fault. Any
// other error is our bug, so it goes on to Express's default handler, which
// replies 500.
const badRequest: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid request" });
  } else {
    next(err);
  }
};

// What each reason the Service can give means over HTTP.
const STATUS: Record<string, number> = {
  reserved: 400,
  "no-such-student": 404,
  "no-such-activity": 404,
  duplicate: 409,
  "already-enrolled": 409,
  "previously-dropped": 409,
  limit: 409,
  "not-enrolled": 409,
};

function reply(res: Response, success: number, result: Result<string>) {
  if (result.ok) res.status(success).json({ ok: true });
  else res.status(STATUS[result.reason]).json({ error: result.reason });
}
