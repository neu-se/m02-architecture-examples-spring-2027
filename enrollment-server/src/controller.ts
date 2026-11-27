// Controller module: the HTTP layer.
// It validates each request, asks Auth who is calling, asks the Service to do
// the work, and turns the Service's result into a status code. It knows Auth
// and Service only by their interfaces.

import express, { type ErrorRequestHandler, type Express, type Response } from "express";
import { z, ZodError } from "zod";

import type { Auth } from "./auth.ts";
import type { Result, Service } from "./service.ts";

const Credentials = z.object({ user: z.string().min(1), password: z.string().min(1) });
const NewActivity = Credentials.extend({ name: z.string().min(1) });

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

export function createApp(auth: Auth, service: Service): Express {
  const app = express();
  app.use(express.json());

  // Anyone may create a student; the new login and password are in the body.
  app.post("/students", async (req, res) => {
    const body = Credentials.parse(req.body);

    const hash = await auth.hashPassword(body.password);
    reply(res, 201, await service.createStudent(body.user, hash));
  });

  // Only the admin may create an activity.
  app.post("/activities", async (req, res) => {
    const body = NewActivity.parse(req.body);

    const caller = await auth.authenticate(body);
    if (!caller) return void res.status(401).json({ error: "Unauthorized" });
    if (!caller.isAdmin) return void res.status(403).json({ error: "Forbidden" });

    reply(res, 201, await service.createActivity(body.name));
  });

  // A student signs up or drops, only for themself.
  function studentRoute(
    path: string,
    act: (student: string, activity: string) => Promise<Result<string>>,
  ) {
    app.post<{ name: string }>(path, async (req, res) => {
      const body = Credentials.parse(req.body);

      const caller = await auth.authenticate(body);
      if (!caller) return void res.status(401).json({ error: "Unauthorized" });

      reply(res, 200, await act(caller.name, req.params.name));
    });
  }
  studentRoute("/activities/:name/signups", (s, a) => service.signUp(s, a));
  studentRoute("/activities/:name/drops", (s, a) => service.drop(s, a));

  // Malformed JSON (from express.json) and malformed bodies (from Zod's parse)
  // are both the caller's fault. Anything else is our bug, so it goes on to
  // Express's default handler, which replies 500.
  const badRequest: ErrorRequestHandler = (err, _req, res, next) => {
    if (err instanceof SyntaxError || err instanceof ZodError) {
      res.status(400).json({ error: "Invalid request" });
    } else {
      next(err);
    }
  };
  app.use(badRequest);

  return app;
}
