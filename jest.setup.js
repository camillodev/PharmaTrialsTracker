const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([{ id: 1 }]),
  query: {
    labResults: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(null) // First call returns null (no duplicate)
        .mockResolvedValueOnce({ id: 1 }), // Second call returns a result (duplicate found)
      findMany: jest
        .fn()
        .mockResolvedValue([
          { patientId: 'P1001', testType: 'LDL', value: 150 },
        ]), // Mocked response for findMany
    },
    patients: {
      findFirst: jest.fn().mockResolvedValue({ id: 'P1001' }),
      findMany: jest.fn().mockResolvedValue([
        { id: 'P1001', trialId: 'T999', enrollDate: new Date() },
        { id: 'P1002', trialId: 'T999', enrollDate: new Date() },
      ]), // Mocked response for findMany
    },
    symptoms: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'S1', patientId: 'P1001', symptom: 'fever', severity: 5 },
        ]), // Mocked response for findMany
    },
  },
};

jest.mock('@db', () => ({
  db: mockDb,
  eq: jest.fn(),
  and: jest.fn(),
  labResults: {
    fileHash: 'fileHash',
    patientId: 'patientId',
  },
  patients: {
    id: 'id',
  },
}));
