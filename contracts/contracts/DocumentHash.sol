// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DocumentHash {
    mapping(bytes32 => uint256) private hashTimestamps;
    mapping(bytes32 => address) private hashOwners;

    event HashStored(bytes32 indexed docHash, address indexed owner, uint256 timestamp);

    function storeHash(bytes32 docHash) external {
        require(hashTimestamps[docHash] == 0, "Hash already exists");
        hashTimestamps[docHash] = block.timestamp;
        hashOwners[docHash] = msg.sender;
        emit HashStored(docHash, msg.sender, block.timestamp);
    }

    function verifyHash(bytes32 docHash) external view returns (bool exists, uint256 timestamp, address owner) {
        exists = hashTimestamps[docHash] != 0;
        timestamp = hashTimestamps[docHash];
        owner = hashOwners[docHash];
    }
}
