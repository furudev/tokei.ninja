import { type WatchEventType, watch } from 'fs';
import { gray, green, red } from 'kolorist';
import { transform } from 'lightningcss';

const SITE_NAME = Bun.env.SITE_NAME || 'tokei.ninja';
const PORT = Bun.env.PORT || 8080;
const APP_DIR = '../app';
const CERTS_DIR = '../certs';
const SRC_DIR = `${APP_DIR}/src`;
const PUBLIC_DIR = `${APP_DIR}/public`;
const BUILD_DIR = `${PUBLIC_DIR}/build`;

// REFACTOR: simplify watchers (maybe some config)

type AllowedFileType = {
  ext: `.${string}`;
  transformer: (filename: string) => Promise<void>;
};

const getFilenameWithoutExt = (filename: string) => {
  return filename.split('/').at(-1)?.split('.').at(0);
};

const getExt = (filename: string, withDot?: boolean) => {
  const ext = filename.split('/').at(-1)?.split('.').at(-1);

  if (withDot) {
    return `.${ext}`;
  }
  return ext;
};

const handleTransformError = (error: Error, filename: string) => {
  const ext = getExt(filename);

  console.log(
    `${red('[Error]:')} ${ext} transform failed.\n* ${red('Reason:')}`,
    error.message,
    red(filename),
  );
};

const allowedFilesConfig: AllowedFileType[] = [
  {
    ext: '.php',
    transformer: async (filename) => {},
  },
  {
    ext: '.css',
    transformer: async (filename) => {
      const file = Bun.file(`${SRC_DIR}/${filename}`);
      const fileContent = await file.text();
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { code } = transform({
        filename: fileContent,
        code: fileBuffer,
        minify: true,
      });

      Bun.write(
        `${BUILD_DIR}/${getFilenameWithoutExt(filename)}.min.css`,
        code,
      );
      // BUG: transformer calls are increasing each time when we update a file.
      console.log(`TRANSFORMER CALLED: ${filename}`);
    },
  },
  {
    ext: '.ts',
    transformer: async (filename) => {
      await Bun.build({
        entrypoints: [`${SRC_DIR}/${filename}`],
        outdir: BUILD_DIR,
        minify: true,
        naming: '[dir]/[name].min.[ext]',
      });
    },
  },
];

const watcherCallback = (event: WatchEventType, filename: string | null) => {
  if (!filename) {
    throw new Error(`${filename} is undefined.`);
  }

  console.log(`[⌚️] ${gray('File:')} ${filename} | ${gray('Event:')} ${event}`);
};

const srcWatcher = watch(SRC_DIR, { recursive: true }, watcherCallback);
const indexWatcher = watch(`${APP_DIR}/index.php`, {}, watcherCallback);

Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }

    return new Response('Upgrade failed', { status: 500 });
  },
  websocket: {
    open(ws) {
      ws.send('[⌚️ Tokei] Connection with server established.');
    },
    async message(ws) {
      indexWatcher.on('change', async (event, filename) => {
        try {
          await allowedFilesConfig
            .find(({ ext }) => ext === '.php')
            ?.transformer(filename.toString());

          ws.send(event);
        } catch (error) {
          if (!(error instanceof Error)) {
            return;
          }

          handleTransformError(error, filename.toString());
        }
      });
      srcWatcher.on('change', async (event, filename) => {
        try {
          for await (const fileType of allowedFilesConfig) {
            if (fileType.ext === getExt(filename.toString(), true)) {
              await fileType.transformer(filename.toString());
            }
          }

          ws.send(event);
        } catch (error) {
          if (!(error instanceof Error)) {
            return;
          }

          handleTransformError(error, filename.toString());
        }
      });
    },
    close(ws, code) {
      ws.send(`[⌚️ Tokei] Connection closed with status: ${code}.`);
    },
    perMessageDeflate: true,
  },
  port: PORT,
  tls: {
    cert: Bun.file(`${CERTS_DIR}/${SITE_NAME}.pem`),
    key: Bun.file(`${CERTS_DIR}/${SITE_NAME}-key.pem`),
  },
});

console.log(`[⌚️ Tokei] Watching for changes on port: ${green(PORT)}`);
process.on('SIGINT', () => {
  console.log(`\n[⌚️ Tokei] ${green('See you soon, Ninja!')} Bye 👋`);
  indexWatcher.close();
  srcWatcher.close();

  process.exit();
});
