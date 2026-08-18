import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const host = "127.0.0.1";
const reportDirectory = resolve("QA/playwright/playwright-report");
const playwrightCli = join(process.cwd(), "node_modules", "playwright", "cli.js");

if (!existsSync(join(reportDirectory, "index.html"))) {
  console.error("No existe un informe Playwright. Ejecuta primero npm.cmd run qa:e2e:chromium.");
  process.exit(1);
}

const port = await new Promise((resolvePort, reject) => {
  const probe = createServer();
  probe.once("error", reject);
  probe.listen(0, host, () => {
    const address = probe.address();
    if (!address || typeof address === "string") {
      probe.close();
      reject(new Error("No se pudo reservar un puerto local para el informe."));
      return;
    }
    probe.close(() => resolvePort(address.port));
  });
});

console.log(`Abriendo el informe QA en un puerto disponible: http://${host}:${port}`);
console.log("Mantén esta terminal abierta. Pulsa Ctrl+C para cerrar el informe.");

const child = spawn(
  process.execPath,
  [playwrightCli, "show-report", reportDirectory, "--host", host, "--port", String(port)],
  { stdio: "inherit" },
);

child.once("exit", (code) => process.exit(code ?? 0));
child.once("error", (error) => {
  console.error(`No se pudo abrir el informe: ${error.message}`);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}
