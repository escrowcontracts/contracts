exports.default = new class Utility {
  hex(value) {
    return '0x' + BigInt(value).toString(16);
  }
  ether(num) {
    return this.hex(num * 10 ** 18);
  }
  randomHash(ethers) {
    // random 15 bytes = 30 characters. this is used for signing messages for contract cancel, update...
    const random = Buffer.from(ethers.utils.randomBytes(15)).toString('hex');
    const bytes32 = ethers.utils.formatBytes32String(random).substring(0, 62) + '3030';
    return bytes32;
  }
  async sign(ethers, signer, msg) {
    const flastSig = await signer.signMessage(msg);
    return ethers.utils.splitSignature(flastSig);
  }
  getSignMessage(ethers, prefix, hash) {
    return prefix + ethers.utils.parseBytes32String(hash.substring(0, 62) + '0000') + '00';
  }
  padWithZero(num) {
    return String(BigInt(num).toString()).padStart(32, '0');
  }
  async sendETH(signer, to, amount) {
    const tx = {
      from: signer.address,
      to,
      value: amount,
    }
    try {
      const sendTx = await signer.sendTransaction(tx);
      await sendTx.wait();
    } catch(e) {
    }
  }
}();