import { pgTable, text, serial, integer, timestamp, foreignKey, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const trials = pgTable("trials", {
  id: text("id").primaryKey(), // e.g. T999
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
});

export const patients = pgTable("patients", {
  id: text("id").primaryKey(), // e.g. P1001
  trialId: text("trial_id").notNull().references(() => trials.id),
  enrollDate: timestamp("enroll_date").notNull(),
});

export const symptoms = pgTable("symptoms", {
  id: text("id").primaryKey(), // e.g. S1
  patientId: text("patient_id").notNull().references(() => patients.id),
  symptom: text("symptom").notNull(),
  severity: integer("severity").notNull(), // 1-10
  reportedDate: timestamp("reported_date").notNull(),
});

export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  testType: text("test_type").notNull(), // e.g. LDL, Glucose
  value: decimal("value").notNull(),
  units: text("units").notNull(),
  resultDate: timestamp("result_date").notNull(),
  fileHash: text("file_hash"),
});

export const medicationEvents = pgTable('medication_events', {
  id: serial('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  medication: text('medication').notNull(),
  dosage: text('dosage').notNull(),
  administeredDate: timestamp('administered_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const outlierLogs = pgTable("outlier_logs", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  type: text("type").notNull(), // lab, symptom, enrollment
  reportedDate: timestamp("reported_date").notNull(), // When the event actually occurred
});

// Relations
export const patientsRelations = relations(patients, ({ one, many }) => ({
  trial: one(trials, {
    fields: [patients.trialId],
    references: [trials.id],
  }),
  symptoms: many(symptoms),
  labResults: many(labResults),
}));

export const symptomsRelations = relations(symptoms, ({ one }) => ({
  patient: one(patients, {
    fields: [symptoms.patientId],
    references: [patients.id],
  }),
}));

export const labResultsRelations = relations(labResults, ({ one }) => ({
  patient: one(patients, {
    fields: [labResults.patientId],
    references: [patients.id],
  }),
}));

// Schemas
export const insertTrialSchema = createInsertSchema(trials);
export const selectTrialSchema = createSelectSchema(trials);

export const insertPatientSchema = createInsertSchema(patients);
export const selectPatientSchema = createSelectSchema(patients);

export const insertSymptomSchema = createInsertSchema(symptoms);
export const selectSymptomSchema = createSelectSchema(symptoms);

export const insertLabResultSchema = createInsertSchema(labResults);
export const selectLabResultSchema = createSelectSchema(labResults);

export const insertOutlierLogSchema = createInsertSchema(outlierLogs);
export const selectOutlierLogSchema = createSelectSchema(outlierLogs);

// Types
export type Trial = typeof trials.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Symptom = typeof symptoms.$inferSelect;
export type LabResult = typeof labResults.$inferSelect;
export type OutlierLog = typeof outlierLogs.$inferSelect;