import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { FileProcessor } from "./services/fileProcessor";
import { WebSocketServer } from "./services/websocket";
import { generateTrialSummary } from "./services/openai";
import { db } from "@db";
import { eq, avg, count } from "drizzle-orm";
import { patients, symptoms, labResults, outlierLogs } from "@db/schema";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = /\.(csv|json|xml)$/i;
    const allowedMimeTypes = [
      'text/csv',
      'application/json',
      'application/xml',
      'text/xml',
      'text/plain',
      'application/vnd.ms-excel'
    ];

    if (file.originalname.match(allowedExtensions) || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload CSV, JSON, or XML files only.'));
    }
  }
}).single('file'); // Explicitly name the expected field as 'file'

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer(httpServer);
  const fileProcessor = new FileProcessor(wss);

  httpServer.on('upgrade', (request, socket, head) => {
    const protocol = request.headers['sec-websocket-protocol'];
    if (protocol?.includes('vite-hmr')) {
      return;
    }
    wss.handleUpgrade(request, socket, head);
  });

  // Unified file upload endpoint with proper error handling
  app.post("/api/upload", (req, res) => {
    upload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: err.message });
      } else if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      try {
        const result = await fileProcessor.processFile(req.file.buffer.toString());
        res.json({ 
          message: `Processed ${result.count} ${result.type}`,
          type: result.type,
          count: result.count
        });
      } catch (error) {
        console.error('File processing error:', error);
        res.status(400).json({ error: (error as Error).message });
      }
    });
  });

  // Analysis endpoints
  app.get("/api/analysis", async (req, res) => {
    try {
      const [patientCount] = await db
        .select({ value: count() })
        .from(patients);

      const [avgSeverity] = await db
        .select({ value: avg(symptoms.severity) })
        .from(symptoms);

      const [outlierCount] = await db
        .select({ value: count() })
        .from(outlierLogs);

      const recentOutliers = await db
        .select()
        .from(outlierLogs)
        .orderBy(outlierLogs.createdAt)
        .limit(5);

      const summary = await generateTrialSummary({
        totalPatients: patientCount.value || 0,
        avgSymptomSeverity: Number(avgSeverity.value) || 0,
        outlierCount: outlierCount.value || 0,
        recentOutliers: recentOutliers.map(o => o.message),
      });

      res.json({
        stats: {
          patientCount: patientCount.value || 0,
          avgSeverity: Number(avgSeverity.value) || 0,
          outlierCount: outlierCount.value || 0,
        },
        summary,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // In the /api/outliers endpoint
  app.get("/api/outliers", async (req, res) => {
    try {
      const outliers = await db
        .select()
        .from(outlierLogs)
        .orderBy(outlierLogs.reportedDate, "desc")
        .limit(50);

      res.json(outliers);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return httpServer;
}