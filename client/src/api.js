/**
 * @module api
 * @description Centralized fetch wrapper for communicating with the backend.
 * Automatically injects the JWT token into headers if available.
 */

const BASE_URL = '/api/v1';

/**
 * Custom error class for API failures
 */
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Core fetch wrapper
 */
async function fetchClient(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    // Some endpoints like 204 No Content won't return JSON
    if (!response.ok) {
      throw new ApiError('An unexpected error occurred', response.status, 'UNKNOWN');
    }
    return null;
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || data?.message || 'API Error',
      response.status,
      data?.error?.code || data?.code || 'UNKNOWN'
    );
  }

  return data.data;
}

export const api = {
  get: (endpoint, options) => fetchClient(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => fetchClient(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => fetchClient(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options) => fetchClient(endpoint, { ...options, method: 'DELETE' }),
  
  // Custom helper for downloading CSV without trying to parse as JSON
  download: async (endpoint) => {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(`${BASE_URL}${endpoint}`, { headers });
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Extract filename from Content-Disposition if present
    const disposition = response.headers.get('Content-Disposition');
    let filename = 'download.csv';
    if (disposition && disposition.indexOf('attachment') !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) { 
        filename = matches[1].replace(/['"]/g, '');
      }
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};
