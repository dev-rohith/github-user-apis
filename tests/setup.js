import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set test environment defaults
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'test-token';
