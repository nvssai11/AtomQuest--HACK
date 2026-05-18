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

// --- Simple In-Memory Client Cache ---
// Reduces redundant API calls for data that rarely changes during a single session.
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Track active, outstanding network requests to collapse concurrent calls
const pendingRequests = new Map();

// Endpoints that are safe to cache on the client side
const CACHEABLE_ENDPOINTS = [
  '/cycle/current',
  '/admin/hierarchy',
  '/analytics/distribution',
  '/analytics/manager-effectiveness',
  '/checkins/team',
  '/goals/share-recipients'
];

export const api = {
  get: async (endpoint, options) => {
    // 1. Check if the endpoint is cacheable
    const isCacheable = CACHEABLE_ENDPOINTS.some(path => endpoint.startsWith(path));
    
    if (isCacheable && cache.has(endpoint)) {
      const cached = cache.get(endpoint);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data; // Return instantly from memory!
      }
    }

    // 2. Collapse concurrent parallel requests to the exact same endpoint (Deduplication)
    if (pendingRequests.has(endpoint)) {
      return pendingRequests.get(endpoint);
    }

    // 3. Fetch fresh data
    const promise = fetchClient(endpoint, { ...options, method: 'GET' }).finally(() => {
      pendingRequests.delete(endpoint);
    });

    pendingRequests.set(endpoint, promise);

    const data = await promise;

    // 4. Store in cache if cacheable
    if (isCacheable) {
      cache.set(endpoint, { data, timestamp: Date.now() });
    }

    return data;
  },
  
  post: (endpoint, body, options) => fetchClient(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => fetchClient(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options) => fetchClient(endpoint, { ...options, method: 'DELETE' }),
  
  /**
   * Invalidates a specific cached endpoint by deleting it from the cache map.
   */
  invalidateCache: (endpoint) => {
    cache.delete(endpoint);
  },
  
  /**
   * Clears the API cache. Call this after logging out or when an admin explicitly
   * mutates cached state (e.g. progressing the cycle phase).
   */
  clearCache: () => {
    cache.clear();
  },
  
  // Custom helper for downloading CSV without trying to parse as JSON
  download: async (endpoint, defaultFilename = 'export.csv') => {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(`${BASE_URL}${endpoint}`, { headers });
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    let filename = defaultFilename;
    const disposition = response.headers.get('Content-Disposition');
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
    
    // Slight delay is required so the browser doesn't cancel the download by revoking the URL too fast
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  }
};
