import { dryrun } from './commands/dryrun';

const [command, ...rest] = process.argv.slice(2);

if (command === 'dryrun') {
  dryrun(rest).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.error(
    `Unknown command: ${command ?? '(none)'}.\n` +
      'Usage: dryrun [--limit N] [--pages bean|network|all] [--no-llm] [--concurrency N] [--out DIR]'
  );
  process.exit(1);
}
