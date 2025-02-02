
CREATE TABLE IF NOT EXISTS medication_events (
  id SERIAL PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  medication TEXT NOT NULL,
  dosage TEXT NOT NULL,
  administered_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
