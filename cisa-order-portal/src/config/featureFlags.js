/**
 * Feature flags for the application.
 * Set USE_API to true to fetch data from Azure Functions backend.
 * Set to false to use local mock data.
 */
export const featureFlags = {
  USE_API: import.meta.env.VITE_USE_API === 'true',
};

// API base URL (Azure Functions or local dev)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
