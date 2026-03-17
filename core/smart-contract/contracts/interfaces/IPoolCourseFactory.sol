// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPoolCourseFactory
 * @dev Interface for the PoolCourseFactory contract
 */
interface IPoolCourseFactory {
    // ── Structs ──────────────────────────────────
    struct PoolInfo {
        address poolAddress;
        address creator;
        string courseName;
        uint256 createdAt;
        bool isActive;
    }

    // ── Events ───────────────────────────────────
    event PoolCourseCreated(
        address indexed pool,
        address indexed creator,
        string courseName,
        uint256 timestamp
    );
    event PoolDeactivated(address indexed pool, address indexed creator);
    event PoolReactivated(address indexed pool, address indexed creator);

    // ── Functions ────────────────────────────────
    function createPool(string calldata courseName) external returns (address poolAddress);
    function createMultiplePools(string[] calldata courseNames) external returns (address[] memory poolAddresses);
    function deactivatePool(address poolAddress) external;
    function reactivatePool(address poolAddress) external;
    
    // ── View Functions ───────────────────────────
    function getAllPools() external view returns (PoolInfo[] memory);
    function getActivePools() external view returns (PoolInfo[] memory);
    function getPoolCount() external view returns (uint256);
    function getPoolsByCreator(address creator) external view returns (address[] memory);
    function getPoolInfoByCreator(address creator) external view returns (PoolInfo[] memory);
    function getPoolInfo(address poolAddress) external view returns (PoolInfo memory);
    function isPoolValid(address poolAddress) external view returns (bool);
    function poolsByCreator(address creator, uint256 index) external view returns (address);
    function isValidPool(address poolAddress) external view returns (bool);
    function totalPoolsCreated() external view returns (uint256);
    function activePoolsCount() external view returns (uint256);
}