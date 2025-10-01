import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const res = await deploy("HorseRace", {
    from: deployer,
    log: true,
    args: [deployer, 200], // 2% fee to deployer by default
  });

  log(`HorseRace deployed at ${res.address}`);
};

export default func;
func.tags = ["HorseRace"];


