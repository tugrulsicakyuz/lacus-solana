import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  // Get current nonce to avoid nonce conflicts
  let nonce = await ethers.provider.getTransactionCount(deployer.address, "latest");
  console.log("Starting nonce:", nonce);

  // [1/4] Deploy MockUSDC
  console.log("\n[1/4] Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy({ nonce: nonce++ });
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("MockUSDC:", usdcAddress);

  // [2/4] Deploy BondExchange
  console.log("\n[2/4] Deploying BondExchange...");
  const BondExchange = await ethers.getContractFactory("BondExchange");
  const exchange = await BondExchange.deploy(usdcAddress, { nonce: nonce++ });
  await exchange.waitForDeployment();
  const exchangeAddress = await exchange.getAddress();
  console.log("BondExchange:", exchangeAddress);

  // [3/4] Deploy BondFactory
  console.log("\n[3/4] Deploying BondFactory...");
  const BondFactory = await ethers.getContractFactory("BondFactory");
  const factory = await BondFactory.deploy(usdcAddress, exchangeAddress, { nonce: nonce++ });
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("BondFactory:", factoryAddress);

  // [4/4] Link contracts
  console.log("\n[4/4] Linking BondFactory to BondExchange...");
  const tx = await exchange.setBondFactoryAddress(factoryAddress, { nonce: nonce++ });
  await tx.wait();
  console.log("BondFactory linked to BondExchange ✓");

  console.log("\n========== DEPLOYMENT SUMMARY ==========");
  console.log("MockUSDC:    ", usdcAddress);
  console.log("BondExchange:", exchangeAddress);
  console.log("BondFactory: ", factoryAddress);
  console.log("=========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
