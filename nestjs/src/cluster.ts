import cluster from 'node:cluster';
import process from 'node:process';
import { createApp } from './main';

const workers = Number(process.env.WEB_CONCURRENCY ?? '4');
const port = Number(process.env.PORT ?? '3000');
if (!Number.isSafeInteger(workers) || workers < 1 || workers > 128) {
  throw new Error('WEB_CONCURRENCY must be an integer between 1 and 128');
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

if (cluster.isPrimary) {
  let ready = 0;
  let stopping = false;
  for (let i = 0; i < workers; i++) cluster.fork();
  cluster.on('listening', () => {
    ready++;
    if (ready === workers) console.log(`Cluster ready: ${workers} workers`);
  });
  cluster.on('exit', (worker, code, signal) => {
    if (!stopping) {
      console.error(`Worker ${worker.process.pid} exited: ${code ?? signal}`);
      stopping = true;
      for (const child of Object.values(cluster.workers ?? {})) child?.kill();
      process.exitCode = 1;
    }
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      if (stopping) return;
      stopping = true;
      cluster.disconnect(() => process.exit(0));
    });
  }
} else {
  void createApp().then((app) => app.listen(port, process.env.HOST ?? '0.0.0.0'));
}
