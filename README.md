# Clinical Trial Data Management System

A comprehensive platform for managing and analyzing clinical trial data with real-time outlier detection and AI-powered insights.

## Prerequisites

- Node.js v18 or later
- PostgreSQL 15 or later

## Quick Setup (Local Development)

1. **Install PostgreSQL** (if not already installed)

   macOS:
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

   Ubuntu/Debian:
   ```bash
   sudo apt update
   sudo apt install postgresql-15
   ```

2. **Create Database User and Database**

   First, access PostgreSQL command prompt:
   ```bash
   # macOS
   psql postgres

   # Ubuntu/Debian
   sudo -u postgres psql
   ```

   Then create user and database:
   ```sql
   -- Create a new user (change 'myuser' and 'mypassword' to your preferred values)
   CREATE USER myuser WITH PASSWORD 'mypassword';

   -- Create database and grant privileges
   CREATE DATABASE clinical_trials;
   GRANT ALL PRIVILEGES ON DATABASE clinical_trials TO myuser;

   -- Connect to the database
   \c clinical_trials

   -- Grant additional required privileges
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO myuser;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO myuser;
   ```

   Exit PostgreSQL prompt:
   ```sql
   \q
   ```

3. **Install Dependencies & Setup Database**
   ```bash
   # Install project dependencies
   npm install

   # Create .env file with database connection (replace user/password with values from step 2)
   echo "DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/clinical_trials" > .env

   # Initialize database schema
   npm run db:push
   ```

4. **Start the Application**
   ```bash
   npm run dev
   ```

   The application will be available at http://localhost:5000

## Development Features

- Real-time outlier detection for:
  - Lab results (LDL > 200 mg/dL, Glucose > 250 mg/dL)
  - Symptom severity (≥ 8 on scale of 1-10)
  - Data inconsistencies

- Supported file formats:
  - CSV: Patient enrollment data
  - JSON: Symptom records
  - XML: Lab results

## Troubleshooting

### Database Issues

1. **Connection Problems**
   ```bash
   # Verify PostgreSQL is running
   pg_isready

   # Check database exists
   psql -l | grep clinical_trials

   # Test connection with your user
   psql -U myuser -d clinical_trials
   ```

2. **Permission Issues**
   If you encounter permission errors, connect as postgres user and verify:
   ```sql
   -- Connect as postgres user first
   psql postgres

   -- Check user exists
   \du

   -- Verify database permissions
   \l

   -- If needed, grant additional permissions
   GRANT ALL PRIVILEGES ON DATABASE clinical_trials TO myuser;
   ```

3. **Reset Database** (⚠️ Warning: This will delete all data)
   ```bash
   dropdb clinical_trials && createdb clinical_trials
   psql -d clinical_trials -c "GRANT ALL PRIVILEGES ON DATABASE clinical_trials TO myuser;"
   npm run db:push
   ```

### Common Issues

1. **Port Already in Use**
   - The application uses port 5000. Make sure no other service is using this port
   - Change the port in the development environment if needed

2. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env file matches your user/password
   - Ensure the user has proper permissions
   - Try connecting directly: `psql -U myuser -d clinical_trials`

3. **OpenAI Integration** (Optional)
   - If you want to use AI analysis features, add your OpenAI API key to .env:
     ```
     OPENAI_API_KEY=your_api_key_here
     ```
   - Without an API key, the system will use mock data for analysis

For additional help, please open an issue in the repository.

## Testing Concurrent File Ingestion

The system supports parallel processing of multiple file uploads. To test concurrent file ingestion:

1. **Create Test Files**
   ```bash
   mkdir -p test-data
   ```
   
   Sample files will be created in the test-data directory including:
   - Patient CSV files (patients1.csv, patients2.csv)
   - Symptom JSON files (symptoms1.json, symptoms2.json)
   - Lab results XML files (labs1.xml, labs2.xml)

2. **Install Dependencies**
   ```bash
   npm install node-fetch form-data
   ```

3. **Run Concurrent Test**
   ```bash
   npx tsx test-data/concurrent-upload.ts
   ```

The system handles concurrent uploads by:
- Processing multiple files simultaneously using Promise.all
- Maintaining separate database transactions per file
- Broadcasting outliers via WebSocket in real-time
- Preventing duplicates through file hash verification

The test results will show:
- Total processing time
- Number of files processed
- Any outliers detected during ingestion

Expected test results:
- Multiple files processed simultaneously
- Correct data insertion order
- Real-time WebSocket notifications for outliers
- No data corruption or race conditions