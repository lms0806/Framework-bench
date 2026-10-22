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
    const large = await fetch(`http://127.0.0.1:${address.port}/json-large`);
    assert.equal(large.status, 200);
    assert.deepEqual(await large.json(), Array.from({ length: 100 }, (_, index) => {
      const id = index + 1;
      return { id, name: `item-${id}`, value: id * 10 };
    }));
    const aggregate = await fetch(`http://127.0.0.1:${address.port}/aggregate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numbers: Array.from({ length: 1000 }, (_, index) => index + 1) }),
    });
    assert.equal(aggregate.status, 200);
    assert.deepEqual(await aggregate.json(), { count: 1000, sum: 500500, min: 1, max: 1000 });
  } finally {
    await app.close();
  }
});
