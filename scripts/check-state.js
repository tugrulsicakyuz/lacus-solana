import hre from "hardhat";

async function main() {
  console.log("🔍 Checking deployed contract state...\n");

  // Check BondFactory's bondExchange address
  console.log("1️⃣ Checking BondFactory.bondExchange:");
  const factory = await hre.ethers.getContractAt("BondFactory", "0x4ba4De2B6a413065a1b72F3396Af1dC6eaE1b120");
  const bondExchangeAddress = await factory.bondExchange();
  console.log("   BondFactory.bondExchange =", bondExchangeAddress);
  console.log("");

  // Check BondToken balance and total supply
  console.log("2️⃣ Checking BondToken state:");
  const token = await hre.ethers.getContractAt("BondToken", "0x8829f6c96d1d2bd2d9b1b4dc1a4583e9da216de5");
  const exchangeBalance = await token.balanceOf("0x3d6523d560B609062F7958BE4AaA4Ded997378bf");
  const totalSupply = await token.totalSupply();
  
  console.log("   BondToken address: 0x8829f6c96d1d2bd2d9b1b4dc1a4583e9da216de5");
  console.log("   Exchange balance:", hre.ethers.formatUnits(exchangeBalance, 18), "tokens");
  console.log("   Total supply:    ", hre.ethers.formatUnits(totalSupply, 18), "tokens");
  console.log("");

  console.log("✅ State check complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
