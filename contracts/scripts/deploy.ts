import { network } from "hardhat";
import { JsonRpcProvider, ContractFactory, Wallet } from "ethers";
import { readFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const provider = new JsonRpcProvider("https://rpc-amoy.polygon.technology");
  const wallet = new Wallet(process.env.PRIVATE_KEY!, provider);
  
  const artifactPath = resolve("artifacts/contracts/DocumentHash.sol/DocumentHash.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("DocumentHash deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
