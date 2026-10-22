import http from 'k6/http';
import { check, fail } from 'k6';

function positiveInteger(name, fallback) {
  const value = __ENV[name] === undefined ? fallback : Number(__ENV[name]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

const baseUrl = (__ENV.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const endpoint = __ENV.ENDPOINT || 'plaintext';
const responses = {
  plaintext: { body: 'Hello, World!', contentType: 'text/plain' },
  json: { body: '{"message":"Hello, World!"}', contentType: 'application/json' },
};
if (!Object.prototype.hasOwnProperty.call(responses, endpoint)) {
  throw new Error('ENDPOINT must be plaintext or json');
}
const rate = positiveInteger('RATE', 100);
const preAllocatedVUs = positiveInteger('PRE_ALLOCATED_VUS', 100);
const maxVUs = positiveInteger('MAX_VUS', preAllocatedVUs);
if (maxVUs < preAllocatedVUs) {
  throw new Error('MAX_VUS must be at least PRE_ALLOCATED_VUS');
}
const url = `${baseUrl}/${endpoint}`;
const expected = responses[endpoint];

export const options = {
  scenarios: {
    load: {
      executor: 'constant-arrival-rate',
      rate,
      timeUnit: '1s',
      duration: __ENV.DURATION || '30s',
      preAllocatedVUs,
      maxVUs,
      tags: { phase: 'load' },
    },
  },
  thresholds: {
    'http_req_failed{phase:load}': ['rate==0'],
    'checks{phase:load}': ['rate==1'],
    dropped_iterations: ['count==0'],
  },
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
};

function validResponse(response) {
  const contentType = response.headers['Content-Type'] || '';
  return response.status === 200 && response.body === expected.body &&
    contentType.toLowerCase().split(';')[0].trim() === expected.contentType;
}

export function setup() {
  const response = http.get(url, { tags: { phase: 'preflight' }, timeout: '5s' });
  if (!validResponse(response)) {
    fail(`Preflight failed for ${url}: status=${response.status}, content-type=${response.headers['Content-Type']}, body=${response.body}`);
  }
}

export default function () {
  const response = http.get(url, { timeout: '5s' });
  check(response, { 'status, content type and body match': validResponse });
}
