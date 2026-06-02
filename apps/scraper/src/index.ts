import { dryrun } from './commands/dryrun';
import { scrape } from './commands/scrape';

const [command, ...rest] = process.argv.slice(2);

const commands: Record<string, (argv: string[]) => Promise<void>> = {
  dryrun,
  scrape,
};

const handler = command ? commands[command] : undefined;
if (handler) {
  handler(rest).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.error(
    `Unknown command: ${command ?? '(none)'}.\nUsage: scrape [--cache DIR] | process --target emulator|prod [...] | dryrun [...]`,
  );
  process.exit(1);
}
