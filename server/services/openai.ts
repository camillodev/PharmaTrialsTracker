import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

// Get the directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reinitialize with new key
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2, // Limit retries to avoid excessive API calls
  timeout: 10000, // 10 second timeout
});

async function getMockData() {
  try {
    const mockPath = path.join(__dirname, 'mocks', 'openai-mock.json');
    const mockData = await fs.readFile(mockPath, 'utf-8');
    const parsed = JSON.parse(mockData);

    // Format mock data to match our expected response format
    const summary = [
      parsed.insights.patient_count,
      parsed.insights.symptom_analysis.severe_cases,
      parsed.insights.lab_results_analysis.abnormal_results
        .map((r: any) => r.issue)
        .join(' ')
    ].join(' ');

    const riskLevel = parsed.summary.severe_symptoms.count > 1 
      ? "high" 
      : parsed.summary.average_symptom_severity > 4 
        ? "medium" 
        : "low";

    return { summary, riskLevel };
  } catch (error) {
    console.error('Error loading mock data:', error);
    return {
      summary: "Mock data unavailable. Using fallback analysis.",
      riskLevel: "medium"
    };
  }
}

export async function generateTrialSummary(data: {
  totalPatients: number;
  avgSymptomSeverity: number;
  outlierCount: number;
  recentOutliers: string[];
}) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    console.log('Generating trial summary with data:', JSON.stringify(data, null, 2));

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a clinical trial analyst focused on identifying patterns and trends. Analyze the trial data focusing on: \n' +
            '1. Outlier frequency and patterns\n' +
            '2. Severity trends\n' +
            '3. Patient enrollment insights\n' +
            'Respond with JSON containing:\n' +
            '- summary: a detailed analysis highlighting patterns and trends\n' +
            "- riskLevel: 'low' if outliers < 10% of patients and avg severity < 4, " +
            "'medium' if outliers 10-20% or avg severity 4-6, " +
            "'high' if outliers > 20% or avg severity > 6",
        },
        {
          role: 'user',
          content: `Analyze this trial data and identify trends:

          Statistical Overview:
          - Total Patients: ${data.totalPatients}
          - Average Symptom Severity: ${data.avgSymptomSeverity.toFixed(
            1
          )} (scale 1-10)
          - Number of Outliers: ${data.outlierCount}
          - Outlier Percentage: ${(
            (data.outlierCount / data.totalPatients) *
            100
          ).toFixed(1)}%

          Recent Outlier Events (for trend analysis):
          ${data.recentOutliers
            .map((event, i) => `${i + 1}. ${event}`)
            .join('\n')}

          Provide a comprehensive analysis of patterns, trends, and potential concerns.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error('OpenAI returned empty content');
      throw new Error('Empty response from OpenAI');
    }

    console.log('OpenAI response:', content);
    return JSON.parse(content);
  } catch (error: any) {
    console.error("OpenAI API error:", error);

    // For quota exceeded or API errors, use mock data
    if (error?.code === 'insufficient_quota' || error?.code === 'invalid_api_key') {
      console.log('Using mock data due to API error');
      return getMockData();
    }

    return {
      summary: `AI analysis temporarily unavailable: ${error.message}`,
      riskLevel: "unknown"
    };
  }
}