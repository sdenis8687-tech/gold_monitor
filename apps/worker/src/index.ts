import { Bootstrap } from './bootstrap';
import { Poller } from './poller';

async function main() {
  console.log('Gold Monitor Worker starting...');
  console.log(`Node.js ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Run bootstrap first
  const bootstrap = new Bootstrap();
  try {
    await bootstrap.run();
  } catch (err) {
    console.error('Bootstrap error:', err);
    // Continue even if bootstrap fails - poller will fill in data
  }

  // Start poller
  const poller = new Poller();
  poller.start();

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down worker...');
    poller.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Fatal worker error:', err);
  process.exit(1);
});
