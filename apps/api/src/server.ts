import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { AppError } from "./lib/errors.js";
import { discoverStores } from "./services/discovery.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new AppError("Origin is not allowed.", 403));
    },
  }),
);
app.use(express.json({ limit: "32kb" }));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    integrations: {
      context: Boolean(process.env.CONTEXT_DEV_API_KEY),
      googlePlaces: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      llm: Boolean(process.env.LLM_API_KEY),
      firebase: Boolean(process.env.FIREBASE_PROJECT_ID),
    },
  });
});

const discoverySchema = z.object({
  website: z.string().trim().min(3).max(2048),
  prompt: z.string().trim().max(2000).default(""),
});

app.post("/api/discover", async (request, response, next) => {
  try {
    const input = discoverySchema.parse(request.body);
    response.json(await discoverStores(input));
  } catch (error) {
    next(error);
  }
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        error: "Check the website and prompt, then try again.",
        details: error.issues,
      });
      return;
    }

    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    if (statusCode >= 500) console.error(error);
    response.status(statusCode).json({ error: message });
  },
);

app.listen(port, "0.0.0.0", (error) => {
  if (error) {
    console.error("Could not start Stockist API.", error);
    process.exitCode = 1;
    return;
  }
  console.log(`Stockist API listening on port ${port}`);
});
