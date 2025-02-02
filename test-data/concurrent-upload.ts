
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

async function uploadFile(filePath: string) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  
  const response = await fetch('http://0.0.0.0:5001/api/upload', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}

async function runConcurrentTest() {
  const files = [
    'test-data/patients1.csv',
    'test-data/patients2.csv',
    'test-data/symptoms1.json',
    'test-data/symptoms2.json',
    'test-data/labs1.xml',
    'test-data/labs2.xml'
  ];

  console.log('Starting concurrent uploads...');
  const startTime = Date.now();
  
  const uploads = files.map(file => uploadFile(file));
  const results = await Promise.all(uploads);
  
  console.log(`Completed in ${Date.now() - startTime}ms`);
  console.log('Results:', results);
}

runConcurrentTest();
