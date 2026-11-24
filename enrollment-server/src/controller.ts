// Controller module: the HTTP layer.
// For now it only sets up Express and the error reply. The enrollment
// endpoints are added as the Service, Repository and Auth modules appear.

import express, { type ErrorRequestHandler, type Express } from "express";

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  // express.json() throws on malformed JSON; report that as a bad request.
  const badJson: ErrorRequestHandler = (_err, _req, res, _next) => {
    res.status(400).json({ error: "Invalid request" });
  };
  app.use(badJson);

  return app;
}
