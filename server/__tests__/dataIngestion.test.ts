import { FileProcessor } from '../services/fileProcessor';
import { WebSocketServer } from '../services/websocket';
import { db } from '@db';

const mockWss = {
  broadcast: jest.fn(),
} as unknown as WebSocketServer;

describe('Data Ingestion', () => {
  let fileProcessor: FileProcessor;

  beforeEach(() => {
    fileProcessor = new FileProcessor(mockWss);
    jest.clearAllMocks();
  });

  describe('File Type Detection', () => {
    it('should detect CSV files correctly', () => {
      const csvContent = 'patientId,enrollDate\nP1001,2025-01-01';
      expect(fileProcessor.detectFileType(csvContent)).toBe('csv');
    });

    it('should detect JSON files correctly', () => {
      const jsonContent = JSON.stringify([{ id: 'S1', symptom: 'fever' }]);
      expect(fileProcessor.detectFileType(jsonContent)).toBe('json');
    });

    it('should detect XML files correctly', () => {
      const xmlContent =
        '<?xml version="1.0"?><LabResults><Result></Result></LabResults>';
      expect(fileProcessor.detectFileType(xmlContent)).toBe('xml');
    });

    it('should return null for invalid content', () => {
      const invalidContent = 'random text content';
      expect(fileProcessor.detectFileType(invalidContent)).toBeNull();
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate files', async () => {
      const xmlContent = `
        <?xml version="1.0"?>
        <LabResults>
          <Result>
            <patientId>P1001</patientId>
            <testType>LDL</testType>
            <value>150</value>
            <units>mg/dL</units>
            <resultDate>2025-01-01</resultDate>
          </Result>
        </LabResults>
      `;

      // First upload should succeed
      await fileProcessor.processFile(xmlContent);

      // Reset mock to return a value (simulating duplicate)
      (db.query.labResults.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 1,
      });

      // Second upload should throw error
      await expect(fileProcessor.processFile(xmlContent)).rejects.toThrow();
    });
  });

  describe('Data Validation', () => {
    it('should validate lab result data', async () => {
      const invalidXml = `
        <?xml version="1.0"?>
        <LabResults>
          <Result>
            <patientId>P1001</patientId>
            <testType>INVALID_TEST</testType>
            <value>abc</value>
          </Result>
        </LabResults>
      `;

      await expect(fileProcessor.processFile(invalidXml)).rejects.toThrow();
    });

    it('should validate symptom severity range', async () => {
      const invalidJson = JSON.stringify([
        {
          id: 'S1',
          patientId: 'P1001',
          symptom: 'fever',
          severity: 11,
          reportedDate: '2025-01-01',
        },
      ]);

      // Mock patient lookup to succeed
      (db.query.patients.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'P1001',
      });

      // The processing should still succeed but log the outlier
      await fileProcessor.processFile(invalidJson);
      expect(mockWss.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'outlier',
        })
      );
    });
  });

  describe('Analysis Processing', () => {
    it('should detect high LDL values', async () => {
      const xmlContent = `
        <?xml version="1.0"?>
        <LabResults>
          <Result>
            <patientId>P1001</patientId>
            <testType>LDL</testType>
            <value>210</value>
            <units>mg/dL</units>
            <resultDate>2025-01-01</resultDate>
          </Result>
        </LabResults>
      `;

      // Mock the database response to simulate no existing lab results
      (db.query.labResults.findFirst as jest.Mock).mockResolvedValueOnce(null);
      // Mock the patient lookup to succeed
      (db.query.patients.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'P1001',
      });

      await fileProcessor.processFile(xmlContent);
      expect(mockWss.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'outlier',
          data: expect.objectContaining({
            type: 'lab',
            message: expect.stringContaining('210 mg/dL'),
          }),
        })
      );
    });
  });
});
