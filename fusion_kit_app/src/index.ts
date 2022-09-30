import { app, BrowserWindow, shell } from 'electron';
import { spawn, ChildProcess, ChildProcessWithoutNullStreams } from 'child_process';
import { join } from 'path';

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  // Handle creating/removing shortcuts on Windows when installing/uninstalling.
  // eslint-disable-line global-require
  app.quit();
}

// const serverBin = join(process.resourcesPath, 'fusion-kit-server', 'fusion-kit-server');
const serverBin = app.isPackaged
  ? join(process.resourcesPath, "fusion-kit-server", "fusion-kit-server")
  : join(app.getAppPath(), "..", "dist", "fusion-kit-server", "fusion-kit-server");

let serverProcess: ChildProcessWithoutNullStreams;

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    title: "FusionKit [Loading...]",
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  serverProcess = spawn(serverBin);

  const onData = (data: unknown) => {
    const dataString = data.toString();
    const lines = dataString.split("\n");
    lines.forEach((line) => {
      if (line.trim() !== "") {
        console.info(`[Server output] ${line}`);
      }
    });

    // TODO: Use a more reliable way to check if the server is running?
    if (/Uvicorn running on/.test(dataString)) {
      mainWindow.loadURL("http://localhost:2424");
    }
  }

  serverProcess.stdout.on("data", onData);
  serverProcess.stderr.on("data", onData);

  serverProcess.on("close", (code, signal) => {
    console.error(`Server process exited with code ${code} / signal ${signal}`);
    try {
      mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    } catch (exception) {
      console.warn("could not show error page", exception);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.info("Opening external link...");
    shell.openExternal(url);
    return { action: "deny" };
  })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.on('before-quit', async (e: any) => {
  if (serverProcess.exitCode != null) {
    return;
  }

  // Process didn't exit, so try and stop it gracefully first

  e.preventDefault();

  const didStop = await stopProcess(serverProcess, { retries: 5 }).catch(() => false);

  if (!didStop) {
    console.error("failed to stop server process!");
  }

  app.exit(0);
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

interface StopProcessOpts {
  retries?: number,
  forceKillRetries?: number,
  sleepTimeout?: number,
}

async function stopProcess(process: ChildProcess, opts: StopProcessOpts): Promise<boolean> {
  const { retries = 0, sleepTimeout = 1000 } = opts;

  let remainingRetries = retries;

  do {
    if (!isRunning(process)) {
      return true;
    }

    process.kill();
    await sleep(sleepTimeout);

    remainingRetries--;
  } while (remainingRetries > 0);

  console.warn(`server process did not stop gracefully after retrying ${retries} time(s)`);

  process.kill('SIGKILL');
  await sleep(sleepTimeout);
  return !isRunning(process);
}

function sleep(timeout: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  })
}

function isRunning(process: ChildProcess): boolean {
  // NOTE: Other signals may cause this check return false unexpectedly
  return process.exitCode == null && process.signalCode == null;
}
