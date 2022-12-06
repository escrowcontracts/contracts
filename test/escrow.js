const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { formatBytes32String } = require("ethers/lib/utils");
const Bytecode = require('../constants/bytecode');
const Abi = require('../constants/abi');
const Utils = require('./utils/index').default;

describe("Escrow", function () {

  const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  let hash = Utils.randomHash(ethers);
  let amount = Utils.ether(0.5);
  let threshold = 3 * 24 * 3600; // 3 days
  let duration = 7 * 24 * 3600; // 7 days
  let voteMinToken = 100;

  const reHash = () => {
    hash = Utils.randomHash(ethers);
  }
  const reCreate = async () => {
    reHash();
    await expect(
      escrow.connect(buyer).create(
        hash,
        buyer.address,
        seller.address,
        WETH,
        amount,
        duration,
        threshold,
        {
          value: amount
        }
      )
    ).to.emit(escrow, "Created");
  }
  const accept = async () => {
    await expect(
      escrow.connect(seller).accept(
        hash,
        {
          value: amount
        }
      )
    ).to.emit(escrow, "Accepted");
  }

  const Status = {
    Pending: 0, 
    Active: 1, 
    Finished: 2, 
    Disputed: 3, 
    Cancelled: 4
  };

  // Users
  let owner, buyer, seller;
  let voter1, voter2, voter3;

  // Contracts
  let escrow, token, stake, dispute;

  const provider = hre.ethers.provider;
  
  before(async function() {
    [owner, buyer, seller, voter1, voter2, voter3] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy();
    await token.connect(owner).deployed();
  });

  it("deploy escrow contract", async function() {
    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(WETH);
    await escrow.connect(owner).deployed();
  });

  it("deploy judge contract", async function() {
    // 
  });

  it("deploy dispute contract and initialize escrow", async function() {
    const Dispute = await ethers.getContractFactory("Dispute");
    dispute = await Dispute.deploy(WETH);
    await dispute.connect(owner).deployed();

    await dispute.connect(owner).setEscrow(escrow.address);
    expect(await dispute.escrow()).to.equal(escrow.address);

    await expect(
      escrow.connect(owner).setDisputeContract(0, dispute.address)
    ).to.emit(escrow, "DisputeHandlerUpdated");
  });

  it("deploy stake contract and initialize dispute handler", async function() {
    const Stake = await ethers.getContractFactory("Stake");
    stake = await Stake.deploy();

    await stake.connect(owner).deployed();    
    await stake.connect(owner).setToken(token.address);
    expect(await stake.token()).to.equal(token.address);

    await stake.connect(owner).setVoteMinToken(voteMinToken);

    await dispute.connect(owner).setStake(stake.address);
    expect(await dispute.stake()).to.equal(stake.address);
  });

  it("can create contract", async function() {
    // TODO: check contract balance
    const args = [
      buyer.address, // createdBy
      0, // endedBy
      buyer.address, // buyer
      seller.address, // seller
      WETH, // currency
      amount, // balance
      amount, // amount
      duration, // duration
      threshold, // threshold
      new Date(), // createdAt
      0, // startedAt
      0, // endedAt
      Status.Pending, // status
    ];

    await expect(
      escrow.connect(buyer).create(
        hash,
        buyer.address,
        seller.address,
        WETH,
        amount,
        duration,
        threshold
      )
    )
    .to.be.revertedWith("Deposit: Invalid deposit amount");

    await expect(
      escrow.connect(buyer).create(
        hash,
        buyer.address,
        seller.address,
        WETH,
        amount,
        duration,
        threshold,
        {
          value: amount
        }
      )
    ).to.emit(escrow, "Created");

    const balance = await provider.getBalance(escrow.address);
    expect(balance).to.equal(amount);

    const contract = await escrow.contracts(hash);
    expect(contract.balance).to.equal(amount);
  });

  it("can cancel contract and refund", async function () {
    const buyerBalanceBefore = await provider.getBalance(buyer.address);
    await expect(
      escrow.connect(seller).cancel(
        hash
      )
    ).to.emit(escrow, "Cancelled");

    const balance = await provider.getBalance(escrow.address);
    expect(balance).to.equal(0);

    const buyerBalanceAfter = await provider.getBalance(buyer.address);
    expect(buyerBalanceAfter > buyerBalanceBefore).to.equal(true); // consider gas fee
  });

  it("can accept contract", async function() {
    await reCreate();
    await accept();
  });

  it("can cancel contract only if it's not accepted", async function() {
    await expect(
      escrow.connect(seller).cancel(
        hash
      )
    )
    .to.be.revertedWith("Cancel: Contract is already accepted");
  });

  it("deposit when accepted by buyer", async function() {
    const balanceBefore = await provider.getBalance(escrow.address);
    reHash();
    await expect(
      escrow.connect(seller).create(
        hash,
        buyer.address,
        seller.address,
        WETH,
        amount,
        duration,
        threshold
      )
    ).to.emit(escrow, "Created");
    
    await expect(
      escrow.connect(buyer).accept(
        hash
      )
    )
    .to.be.revertedWith("Deposit: Invalid deposit amount");
    
    await expect(
      escrow.connect(buyer).accept(
        hash,
        {
          value: amount
        }
      )
    ).to.emit(escrow, "Accepted");

    const balanceAfter = await provider.getBalance(escrow.address);
    expect(Utils.hex(balanceAfter - balanceBefore)).to.equal(amount);
  });

  it("can cancel contract if both side accept", async function() {
    const buyerBalanceBefore = await provider.getBalance(buyer.address);

    // Correct signer but wrong string
    let msg = Utils.getSignMessage(ethers, "CANCELL", hash);
    let wrongSig = await Utils.sign(ethers, buyer, msg);
    await expect(
      escrow.connect(seller).cancelWithSignature(
        hash,
        wrongSig.v,
        wrongSig.r,
        wrongSig.s
      )
    )
    .to.be.revertedWith("Cancel: Invalid signature");

    msg = Utils.getSignMessage(ethers, "CANCEL", hash);
    const sig = await Utils.sign(ethers, buyer, msg);
    await expect(
      escrow.connect(seller).cancelWithSignature(
        hash,
        sig.v,
        sig.r,
        sig.s
      )
    )
    .to.emit(escrow, "Cancelled");

    const buyerBalanceAfter = await provider.getBalance(buyer.address);
    expect(Utils.hex(buyerBalanceAfter - buyerBalanceBefore) > 0).to.equal(true);
  });

  it("buyer can finish contract", async function() {
    await reCreate();
    await accept();

    await expect(
      escrow.connect(seller).finish(
        hash
      )
    ).to.be.revertedWith("Finish: Can't finish until buyer approve or deadline is passed");

    const sellerBalanceBefore = await provider.getBalance(seller.address);

    await expect(
      escrow.connect(buyer).finish(
        hash
      )
    ).to.emit(escrow, "Finished");
    const sellerBalanceAfter = await provider.getBalance(seller.address);
    expect(Utils.hex(sellerBalanceAfter - sellerBalanceBefore) >= 0).to.equal(true);
  });

  it("can update contract if both sides accept", async function() {
    await reCreate();
    await accept();

    amount = Utils.ether(0.2);
    duration = 10 * 24 * 3600; // 10 days
    threshold = 5 * 24 * 3600; // 5 days

    const content = "UPDATE" + BigInt(amount).toString() + BigInt(duration).toString() + BigInt(threshold).toString();
    let msg = Utils.getSignMessage(ethers, content, hash);
    const sig = await Utils.sign(ethers, buyer, msg);

    await expect(
      escrow.connect(seller).updateWithSignature(
        hash,
        amount,
        duration,
        threshold,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.emit(escrow, "Updated");
  });

  it("seller can end contract after deadline threshold", async function() {
    await provider.send("evm_increaseTime", [3600 * 24 * 12]);
    await expect(
      escrow.connect(seller).finish(
        hash
      )
    ).to.be.revertedWith("Finish: Can't finish until buyer approve or deadline is passed");

    await provider.send("evm_increaseTime", [3600 * 24 * 3]);
    await expect(
      escrow.connect(seller).finish(
        hash
      )
    ).to.emit(escrow, "Finished");
  });
  
  it("can create dispute and money transferred to dispute contract", async function() {
    await reCreate();
    await accept();

    await expect(
      escrow.connect(buyer).dispute(hash, 0)
    ).to.emit(escrow, "Disputed");
    
    expect(
      await provider.getBalance(dispute.address)
    ).to.equal(amount);
  });

  it("seller cannot finish contract if disputed", async function () {
    await provider.send("evm_increaseTime", [3600 * 24 * (duration + threshold + 1)]);
    await expect(
      escrow.connect(seller).finish(
        hash
      )
    ).to.be.revertedWith("Finish: Contract is not active");
  });

  it("token holder can stake to participate voting", async function() {
    await token.connect(owner).airdrop(voter1.address, voteMinToken);
    await token.connect(owner).airdrop(voter2.address, voteMinToken);
    await token.connect(owner).airdrop(voter3.address, voteMinToken);
    
    await token.connect(voter1).approve(stake.address, voteMinToken);
    await token.connect(voter2).approve(stake.address, voteMinToken);
    await token.connect(voter3).approve(stake.address, voteMinToken);

    await expect(
      stake.connect(voter1).deposit(voteMinToken)
    ).to.emit(stake, "Deposit");
    await expect(
      stake.connect(voter2).deposit(voteMinToken)
    ).to.emit(stake, "Deposit");
    await expect(
      stake.connect(voter3).deposit(voteMinToken - 10)
    ).to.emit(stake, "Deposit");

    expect(await stake.canVote(voter3.address)).to.equal(false);

    await expect(
      stake.connect(voter3).deposit(10)
    ).to.emit(stake, "Deposit");

    expect(await stake.canVote(voter3.address)).to.equal(true);
  });

  it("stakers can vote to a dispute and can resolve dispute with votes signature", async function() {
    expect(await stake.canVote(buyer.address)).to.equal(false);
    let wrongSig = await Utils.sign(ethers, buyer, Utils.getSignMessage(ethers, "VOTE00", hash));    
    // S0B10
    let vote1Sig = await Utils.sign(ethers, voter1, Utils.getSignMessage(ethers, "VOTE01", hash));    
    // S1B9
    let vote2Sig = await Utils.sign(ethers, voter2, Utils.getSignMessage(ethers, "VOTE12", hash));
    // S1B9
    let vote3Sig = await Utils.sign(ethers, voter3, Utils.getSignMessage(ethers, "VOTE13", hash));

    await expect(
      dispute.connect(buyer).resolve(
        hash, 
        [
          buyer.address,
          voter1.address, 
          voter2.address,
          voter3.address
        ],
        [ 0, 0, 1, 1 ],
        [
          wrongSig.v,
          vote1Sig.v,
          vote2Sig.v,
          vote3Sig.v,
        ],
        [
          wrongSig.r,
          vote1Sig.r,
          vote2Sig.r,
          vote3Sig.r,
        ],
        [
          wrongSig.s,
          vote1Sig.s,
          vote2Sig.s,
          vote3Sig.s,
        ]
      )
    ).to.be.revertedWith('Resolve: Invalid voter');

    // S0B10
    vote1Sig = await Utils.sign(ethers, voter1, Utils.getSignMessage(ethers, "VOTE00", hash));    
    // S1B9
    vote2Sig = await Utils.sign(ethers, voter2, Utils.getSignMessage(ethers, "VOTE11", hash));
    // S1B9
    vote3Sig = await Utils.sign(ethers, voter3, Utils.getSignMessage(ethers, "VOTE12", hash));

    const buyerBalanceBefore = await provider.getBalance(buyer.address);
    const sellerBalanceBefore = await provider.getBalance(seller.address);
    await expect(
      dispute.connect(buyer).resolve(
        hash, 
        [
          voter1.address, 
          voter2.address,
          voter3.address
        ],
        [ 0, 1, 1 ],
        [
          vote1Sig.v,
          vote2Sig.v,
          vote3Sig.v,
        ],
        [
          vote1Sig.r,
          vote2Sig.r,
          vote3Sig.r,
        ],
        [
          vote1Sig.s,
          vote2Sig.s,
          vote3Sig.s,
        ]
      )
    ).to.emit(dispute, "Resolved");
    
    const buyerBalanceAfter = await provider.getBalance(buyer.address);
    const sellerBalanceAfter = await provider.getBalance(seller.address);
    const buyerIncome = buyerBalanceAfter - buyerBalanceBefore;
    const sellerIncome = sellerBalanceAfter - sellerBalanceBefore;

    expect(
      buyerIncome > sellerIncome * 8 && 
      buyerIncome < sellerIncome * 10
    ).to.equal(true);
  });

  it("can resolve dispute themselves", async function() {
    await reCreate();
    await accept();

    await expect(
      escrow.connect(buyer).dispute(hash, 0)
    ).to.emit(escrow, "Disputed");

    const buyerSig = await Utils.sign(ethers, buyer, Utils.getSignMessage(ethers, "RESOLVE1", hash));
    await expect(
      dispute.connect(seller).resolveWithSignature(
        hash, 
        0, // wrong
        buyerSig.v,
        buyerSig.r,
        buyerSig.s,
      )
    ).to.be.revertedWith('Resolve: Invalid signature');

    await expect(
      dispute.connect(seller).resolveWithSignature(
        hash, 
        1,
        buyerSig.v,
        buyerSig.r,
        buyerSig.s,
      )
    ).to.emit(dispute, 'Resolved');
  });

  //

  it("can create dispute with signature of dividend and winner from a judge", async function() {
  });

  it("when a dispute is accepted for both side, one can end the contract with the dispute result", async function() {
  });

  it("one can end contract if there is no dispute response", async function() {
  });

  it("cannot create more disputes if winner is clear depending on maxJudges", async function() {
  });

  it("can create public dispute", async function() {
  });

  it("can submit public dispute result with arrays of signatures", async function() {
  });

  it("cannot create a private dispute if there is public dispute", async function() {
  });
});
