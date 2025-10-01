const { spawn } = require("child_process");
const net = require("net");

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => tester.once("close", () => resolve(true)).close())
      .listen(port, "0.0.0.0");
  });
}

async function findOpenPort(preferred, maxAttempts = 20) {
  let port = preferred;
  for (let i = 0; i < maxAttempts; i++) {
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFree(port);
    if (free) return port;
    port += 1;
  }
  throw new Error(`No free port found near ${preferred}`);
}

(async () => {
  try {
    const base = Number(process.env.HARDHAT_PORT || 8545);
    const port = await findOpenPort(base);
    const args = ["node", "--port", String(port), "--hostname", "0.0.0.0"]; 
    console.log(`[start-node] Launch hardhat ${args.join(" ")} ...`);
    const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["hardhat", ...args], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env, HARDHAT_NETWORK: "hardhat" },
    });
    child.on("exit", (code) => process.exit(code ?? 0));
  } catch (e) {
    console.error("[start-node] failed:", e);
    process.exit(1);
  }
})();


// dev note 5

// dev note 17
