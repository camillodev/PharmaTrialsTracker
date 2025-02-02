import { FileProcessor } from '../services/fileProcessor';
import { WebSocketServer } from '../services/websocket';
import { db } from '@db';

const mockWss = {
  broadcast: jest.fn(),
} as unknown as WebSocketServer;

describe('Concurrent File Ingestion', () => {
  let fileProcessor: FileProcessor;

  beforeEach(() => {
    fileProcessor = new FileProcessor(mockWss);
    jest.clearAllMocks();

    // Cast fileProcessor to any to bypass TypeScript checks for the spy
    jest
      .spyOn(fileProcessor as any, 'isFileDuplicate')
      .mockResolvedValue(false);
  });

  it('should handle multiple file uploads concurrently', async () => {
    const files = [
      {
        content: 'patientId,enrollDate\nP1001,2025-01-01\nP1002,2025-01-02',
        type: 'csv',
      },
      {
        content: JSON.stringify([
          { id: 'S1', patientId: 'P1001', symptom: 'fever', severity: 5 },
        ]),
        type: 'json',
      },
      {
        content: `<?xml version="1.0"?>
          <LabResults>
            <Result>
              <patientId>P1001</patientId>
              <testType>LDL</testType>
              <value>150</value>
            </Result>
          </LabResults>`,
        type: 'xml',
      },
    ];

    const startTime = Date.now();

    // Process files concurrently
    await Promise.all(
      files.map((file) => fileProcessor.processFile(file.content))
    );

    const processingTime = Date.now() - startTime;
    console.log(`Concurrent processing time: ${processingTime}ms`);

    // Verify all data was processed
    const patients = await db.query.patients.findMany();
    const symptoms = await db.query.symptoms.findMany();
    const labs = await db.query.labResults.findMany();

    expect(patients).toHaveLength(2);
    expect(symptoms).toHaveLength(1);
    expect(labs).toHaveLength(1);
  });
});
