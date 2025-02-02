import { parse as csvParse } from 'csv-parse';
import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import { db } from '@db';
import {
  patients,
  symptoms,
  labResults,
  outlierLogs,
  trials,
  medicationEvents,
} from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { WebSocketServer } from './websocket';

const xmlParser = new XMLParser();

// Define threshold constants
const THRESHOLDS = {
  LDL: 200, // mg/dL
  GLUCOSE: 250, // mg/dL
  SYMPTOM_SEVERITY: 8 // on a 0-10 scale
};

export class FileProcessor {
  private wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
  }

  detectFileType(content: string): 'csv' | 'json' | 'xml' | null {
    // Try parsing as JSON
    try {
      JSON.parse(content);
      return 'json';
    } catch {}

    // Check for XML structure
    if (content.trim().startsWith('<?xml') || content.trim().startsWith('<')) {
      try {
        xmlParser.parse(content);
        return 'xml';
      } catch {}
    }

    // Check for CSV structure
    const lines = content.trim().split('\n');
    if (lines.length >= 1) {
      const firstLine = lines[0].trim();
      const expectedColumns = ['patientId', 'enrollDate', 'trialId'];
      const hasRequiredColumns = expectedColumns.some(col => firstLine.toLowerCase().includes(col.toLowerCase()));
      if (hasRequiredColumns && firstLine.includes(',')) {
        return 'csv';
      }
    }

    return null;
  }

  private createHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async isFileDuplicate(hash: string, type: string): Promise<boolean> {
    const result = await db.query.labResults.findFirst({
      where: eq(labResults.fileHash, hash),
    });
    return !!result;
  }

  async processFile(content: string) {
    const fileType = this.detectFileType(content);
    if (!fileType) {
      throw new Error(
        'Invalid file format. Please upload CSV, JSON, or XML files only.'
      );
    }

    const fileHash = this.createHash(content);
    if (await this.isFileDuplicate(fileHash, fileType)) {
      throw new Error(
        'This file has already been processed. Skipping to prevent duplicates.'
      );
    }

    switch (fileType) {
      case 'csv':
        return this.processCSV(content);
      case 'json':
        return this.processJSON(content);
      case 'xml':
        return this.processXML(content, fileHash);
    }
  }

  private async processCSV(content: string) {
    return new Promise((resolve, reject) => {
      csvParse(
        content,
        {
          columns: true,
          skip_empty_lines: true,
        },
        async (error, records: any[]) => {
          if (error) reject(error);

          // Check if this is a medication events file by looking for patientCode column
          if (records[0]?.patientCode) {
            try {
              for (const record of records) {
                const patientId = record.patientCode; // Map patientCode to patientId

                // Check if patient exists
                const patient = await db.query.patients.findFirst({
                  where: eq(patients.id, patientId),
                });

                if (!patient) {
                  await this.logOutlier(
                    patientId,
                    `Unknown patient in medication events: ${patientId}`,
                    'reference',
                    new Date()
                  );
                  continue;
                }

                // Validate medication field exists and is not empty
                if (!record.medication) {
                  await this.logOutlier(
                    patientId,
                    `Missing or invalid medication name`,
                    'format',
                    new Date()
                  );
                  continue;
                }

                const medicationName = record.medication.toString().trim();

                // Check for duplicate records
                const existingEvent = await db.query.medicationEvents.findFirst({
                  where: and(
                    eq(medicationEvents.patientId, patientId),
                    eq(medicationEvents.medication, medicationName.toUpperCase()),
                    eq(medicationEvents.administeredDate, new Date(record.administeredDate))
                  )
                });

                if (existingEvent) {
                  await this.logOutlier(
                    patientId,
                    `Duplicate medication event: ${medicationName} at ${record.administeredDate}`,
                    'duplicate',
                    new Date(record.administeredDate)
                  );
                  continue;
                }

                // Validate and process medication event
                try {
                  // Validate dosage format (should be number + unit)
                  const dosagePattern = /^\d+(\.\d+)?\s*(mg|ml|g|mcg)$/i;
                  if (!dosagePattern.test(record.dosage)) {
                    await this.logOutlier(
                      patientId,
                      `Invalid dosage format: ${record.dosage}`,
                      'format',
                      new Date()
                    );
                  }

                  // Validate administered date
                  const administeredDate = new Date(record.administeredDate);
                  if (isNaN(administeredDate.getTime())) {
                    await this.logOutlier(
                      patientId,
                      `Invalid administered date: ${record.administeredDate}`,
                      'format',
                      new Date()
                    );
                  }

                  // Validate medication field exists and is not empty
                  if (!record.medication) {
                    await this.logOutlier(
                      patientId,
                      `Missing or invalid medication name`,
                      'format',
                      new Date()
                    );
                    continue;
                  }

                  const medicationName = record.medication.toString().trim();

                  // Check if medication name is standardized (uppercase)
                  if (medicationName !== medicationName.toUpperCase()) {
                    await this.logOutlier(
                      patientId,
                      `Non-standardized medication name: ${medicationName}`,
                      'format',
                      new Date()
                    );
                  }

                  // Insert the record after validation
                  await db.insert(medicationEvents).values({
                    patientId: patientId,
                    medication: medicationName.toUpperCase(),
                    dosage: record.dosage,
                    administeredDate: administeredDate,
                  });
                } catch (err) {
                  console.error(`Error processing medication event for patient ${patientId}:`, err);
                }
              }
              resolve({ count: records.length, type: 'medication-events' });
              return;
            } catch (err) {
              reject(err);
            }
          }

          try {
            // Create trial if it doesn't exist
            const defaultTrialId = 'T999';
            await db
              .insert(trials)
              .values({
                id: defaultTrialId,
                name: 'Default Trial',
                startDate: new Date(),
              })
              .returning();

            // Process enrollments and check for potential outliers
            for (const record of records) {
              try {
                await db
                  .insert(patients)
                  .values({
                    id: record.patientId,
                    trialId: record.trialId || defaultTrialId,
                    enrollDate: new Date(record.enrollDate),
                  })
                  .returning();

                // Log enrollment date outliers if needed
                const enrollDate = new Date(record.enrollDate);
                const today = new Date();
                if (enrollDate > today) {
                  await this.logOutlier(
                    record.patientId,
                    `Future enrollment date detected: ${record.enrollDate}`,
                    'enrollment',
                    enrollDate
                  );
                }
              } catch (err) {
                console.error(
                  `Error inserting patient ${record.patientId}:`,
                  err
                );
              }
            }
            resolve({ count: records.length, type: 'enrollments' });
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  private async logOutlier(
    patientId: string,
    message: string,
    type: string,
    eventDate: Date
  ) {
    try {
      // Check for existing duplicate log
      const existingLog = await db.query.outlierLogs.findFirst({
        where: and(
          eq(outlierLogs.patientId, patientId),
          eq(outlierLogs.message, message),
          eq(outlierLogs.type, type),
          eq(outlierLogs.reportedDate, eventDate)
        )
      });

      if (existingLog) {
        return existingLog;
      }

      const formattedMessage =
        type === 'symptom'
          ? message.replace(
              /High severity symptom \((\d+)\): (.+)/,
              (_, severity, symptom) =>
                `Symptom: ${
                  symptom.charAt(0).toUpperCase() + symptom.slice(1)
                } (severity ${severity})`
            )
          : message;

      const [log] = await db
        .insert(outlierLogs)
        .values({
          patientId,
          message: formattedMessage,
          type,
          createdAt: new Date(), // Current timestamp
          reportedDate: eventDate, // When the event actually occurred
        })
        .returning();

      this.wss.broadcast({
        type: 'outlier',
        data: {
          id: log.id,
          patientId: patientId,
          reportedDate: eventDate,
          createdAt: new Date(),
          message: formattedMessage,
          type: type,
        },
      });

      return log;
    } catch (error) {
      console.error(`Error logging outlier for patient ${patientId}:`, error);
      return null;
    }
  }

  private async processJSON(content: string) {
    const records = JSON.parse(content);

    for (const record of records) {
      try {
        // Verify patient enrollment
        const patient = await db.query.patients.findFirst({
          where: eq(patients.id, record.patientId),
        });

        if (!patient) {
          await this.logOutlier(
            record.patientId,
            `Patient not found in enrollment data for symptom record`,
            'reference',
            new Date(record.reportedDate)
          );
          continue;
        }

        // Insert the symptom record
        await db.insert(symptoms).values({
          id: record.id,
          patientId: record.patientId,
          symptom: record.symptom,
          severity: record.severity,
          reportedDate: new Date(record.reportedDate),
        });

        // Log high severity symptoms
        if (record.severity >= THRESHOLDS.SYMPTOM_SEVERITY) {
          await this.logOutlier(
            record.patientId,
            `High severity symptom (${record.severity}): ${record.symptom}`,
            'symptom',
            new Date(record.reportedDate)
          );
        }
      } catch (error) {
        console.error(
          `Error processing symptom record for patient ${record.patientId}:`,
          error
        );
      }
    }

    return { count: records.length, type: 'symptoms' };
  }

  private async processXML(content: string, fileHash: string) {
    const parsed = xmlParser.parse(content);
    const results = Array.isArray(parsed.LabResults.Result)
      ? parsed.LabResults.Result
      : [parsed.LabResults.Result];

    for (const result of results) {
      try {
        // Verify patient enrollment
        const patient = await db.query.patients.findFirst({
          where: eq(patients.id, result.patientId),
        });

        if (!patient) {
          await this.logOutlier(
            result.patientId,
            `Patient not found in enrollment data for lab result`,
            'reference',
            new Date(result.resultDate)
          );
          continue;
        }

        // Insert the lab result
        await db.insert(labResults).values({
          patientId: result.patientId,
          testType: result.testType,
          value: result.value,
          units: result.units,
          resultDate: new Date(result.resultDate),
          fileHash: fileHash,
        });

        // Check for abnormal values based on test type
        const value = parseFloat(result.value);
        if (result.testType === 'LDL' && value > THRESHOLDS.LDL) {
          const log = await this.logOutlier(
            result.patientId,
            `Abnormal ${result.testType}: ${value} ${result.units}`,
            'lab',
            new Date(result.resultDate)
          );

          if (log) {
            this.wss.broadcast({
              type: 'outlier',
              data: {
                id: log.id,
                patientId: result.patientId,
                reportedDate: new Date(result.resultDate),
                createdAt: new Date(),
                message: `Abnormal ${result.testType}: ${value} ${result.units}`,
                type: 'lab',
              },
            });
          }
        } else if (
          result.testType === 'Glucose' &&
          value > THRESHOLDS.GLUCOSE
        ) {
          const log = await this.logOutlier(
            result.patientId,
            `Abnormal ${result.testType}: ${value} ${result.units}`,
            'lab',
            new Date(result.resultDate)
          );

          if (log) {
            this.wss.broadcast({
              type: 'outlier',
              data: {
                id: log.id,
                patientId: result.patientId,
                reportedDate: new Date(result.resultDate),
                createdAt: new Date(),
                message: `Abnormal ${result.testType}: ${value} ${result.units}`,
                type: 'lab',
              },
            });
          }
        }
      } catch (error) {
        console.error(
          `Error processing lab result for patient ${result.patientId}:`,
          error
        );
      }
    }

    return { count: results.length, type: 'lab-results' };
  }
}