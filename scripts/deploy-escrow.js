import pkg from "hardhat";
const { ethers } = pkg;

const MOCK_USDC_ADDRESS = "0x634aDd941D6844eBc205C0ddc92E2521078Bad30";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying BondEscrow with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const BondEscrow = await ethers.getContractFactory("BondEscrow");
  const escrow = await BondEscrow.deploy(MOCK_USDC_ADDRESS);
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("\n✅ BondEscrow deployed to:", address);
  console.log("\nNext step — paste this into src/config/contracts.ts:");
  console.log(`export const BOND_ESCROW_ADDRESS = "${address}" as const;`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
