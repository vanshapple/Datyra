import { defineConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  solidity: { version: "0.8.28" },
  networks: {
    amoy: {
      type: "http",
      url: "https://rpc-amoy.polygon.technology",
      accounts: [process.env.PRIVATE_KEY ?? ""]
    }
  }
});
