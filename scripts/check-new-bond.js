import hre from "hardhat";

async function main() {
  console.log("🔍 Checking new bond state...\n");

  const exchange = await hre.ethers.getContractAt("BondExchange", "0x3d6523d560B609062F7958BE4AaA4Ded997378bf");
  const token = await hre.ethers.getContractAt("BondToken", "0x2da879Eed6d5B644AF6D0C955cB27F1fC263064f");

  const exchangeBalance = await token.balanceOf("0x3d6523d560B609062F7958BE4AaA4Ded997378bf");
  const totalSupply = await token.totalSupply();
  const bondPrice = await exchange.bondPrices("0x2da879Eed6d5B644AF6D0C955cB27F1fC263064f");
  const factoryAddress = await exchange.bondFactory();

  console.log("Exchange bond balance:", exchangeBalance.toString());
  console.log("Total supply:", totalSupply.toString());
  console.log("Bond price in exchange:", bondPrice.toString());
  console.log("Exchange bondFactory:", factoryAddress.toString());
  console.log("");

  console.log("📊 Formatted values:");
  console.log("  Exchange balance:", hre.ethers.formatUnits(exchangeBalance, 18), "tokens");
  console.log("  Total supply:    ", hre.ethers.formatUnits(totalSupply, 18), "tokens");
  console.log("  Bond price:      ", hre.ethers.formatUnits(bondPrice, 6), "USDC per token");
  console.log("  Factory address: ", factoryAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
