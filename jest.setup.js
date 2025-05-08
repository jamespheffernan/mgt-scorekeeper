// Jest setup file with polyfills
const util = require('util');
const TextEncoder = util.TextEncoder;
const TextDecoder = util.TextDecoder;

// Add TextEncoder/TextDecoder to global scope (needed for some libraries)
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock crypto.randomUUID (used by the database)
if (!global.crypto) {
  global.crypto = {};
}

if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => 'test-uuid-' + Math.random().toString(36).substring(2, 15);
} 