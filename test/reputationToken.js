const Tokens = artifacts.require("Tokens");
const web3 = require("web3-utils")


// the owner for any call is by default owner
contract("Tokens", function (accounts) {

});

function cleanBytes(string) {
  return web3.toAscii(string).replace(/\0.*$/g,'')
}

function convToBytes32(string) {
  return web3.padRight(web3.asciiToHex(string), 64)
}

//  function bytesToBytes32(bytes memory b) public returns (bytes32) {
//     bytes32 temp;
//     assembly {
//       temp := mload(add(b, 32))
//     }
//     return temp;
//   }
