const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createApp } = require('../dist/main');

test('HTTP endpoints return the agreed responses', async () => {
  const app = await createApp();
  try {
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    for (const [path, type, body] of [
      ['/health', 'text/plain; charset=utf-8', 'OK'],
      ['/plaintext', 'text/plain; charset=utf-8', 'Hello, World!'],
      ['/json', 'application/json; charset=utf-8', '{"message":"Hello, World!"}'],
    ]) {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), type);
      assert.equal(await response.text(), body);
    }
  } finally {
    await app.close();
  }
});
