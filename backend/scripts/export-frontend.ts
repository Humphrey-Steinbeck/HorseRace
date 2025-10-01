import * as fs from "fs";
import * as path from "path";

const CONTRACT_NAME = "HorseRace";
const outdir = path.resolve("../frontend/src/abi");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readDeployment(chainName: string) {
  const deployDir = path.resolve("./deployments", chainName);
  if (!fs.existsSync(deployDir)) return undefined;
  const file = path.join(deployDir, `${CONTRACT_NAME}.json`);
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function main() {
  ensureDir(outdir);
  const localhost = readDeployment("localhost");
  const hardhat = readDeployment("hardhat");
  const sepolia = readDeployment("sepolia");

  const abi = (localhost ?? hardhat ?? sepolia)?.abi;
  if (!abi) throw new Error("No deployments found to export ABI");

  const addrLocalhost = (localhost ?? hardhat)?.address ?? "0x0000000000000000000000000000000000000000";
  const addrSepolia = sepolia?.address ?? "0x0000000000000000000000000000000000000000";

  const tsAbi = `export const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi }, null, 2)} as const;\n`;
  const tsAddr = `export const ${CONTRACT_NAME}Addresses = {\n  "31337": { address: "${addrLocalhost}", chainId: 31337, chainName: "hardhat" },\n  "11155111": { address: "${addrSepolia}", chainId: 11155111, chainName: "sepolia" },\n};\n`;

  fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsAbi, "utf-8");
  fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}Addresses.ts`), tsAddr, "utf-8");
  console.log(`ABI and addresses exported to ${outdir}`);
}

main();


