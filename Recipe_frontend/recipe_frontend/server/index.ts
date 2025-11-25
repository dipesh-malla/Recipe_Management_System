import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { homeRouter } from "./routes/home";
import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

export function createServer() {
  const app = express();

  // initialize redis client (optional; if REDIS_URL not set, skip)
  let redisClient: any = null;
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI || null;
  if (redisUrl) {
    try {
      redisClient = createClient({ url: redisUrl });
      redisClient.connect().catch((e: any) => console.warn('redis connect error', e));
      // attach to app locals for route use
      app.locals.redisClient = redisClient;
    } catch (e) {
      console.warn('failed to init redis', e);
      redisClient = null;
    }
  }

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Home cached routes
  const JAVA_BASE_URL = process.env.VITE_JAVA_API_URL || process.env.JAVA_API_URL || "http://localhost:8090/api";
  app.use('/api/home', homeRouter({ redisClient: app.locals.redisClient, javaBaseUrl: JAVA_BASE_URL }));

  return app;
}
