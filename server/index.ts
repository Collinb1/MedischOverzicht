import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Performance optimizations for deployment
if (process.env.NODE_ENV === 'production') {
  // Enable gzip compression voor alle responses
  app.use(compression({
    level: 6, // Good balance tussen speed en compression
    threshold: 1024, // Only compress responses > 1KB
  }));
  
  // Trust proxy for correct client IP when deployed
  app.set('trust proxy', 1);
  
  // Disable x-powered-by header for security
  app.disable('x-powered-by');
}

app.use(express.json({ limit: '10mb' })); // Increased limit for photo uploads
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Cache headers for static assets in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Cache static assets for 1 year
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Cache API responses for 5 minutes
    else if (req.path.startsWith('/api/ambulance-posts') || req.path.startsWith('/api/cabinets')) {
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    }
    // Cache object storage requests for 1 hour
    else if (req.path.startsWith('/objects/')) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
    }
  }

  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
