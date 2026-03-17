// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./PoolCourse.sol";

/**
 * @title PoolCourseFactory
 * @dev Factory contract for creating and managing PoolCourse instances
 * @notice This contract allows anyone to create course pools and tracks all created pools
 */
contract PoolCourseFactory is Ownable, ReentrancyGuard, Pausable {
    // ── State Variables ──────────────────────────
    struct PoolInfo {
        address poolAddress;
        address creator;
        string courseName;
        uint256 createdAt;
        bool isActive;
    }

    PoolInfo[] private allPools;
    mapping(address => address[]) public poolsByCreator;
    mapping(address => bool) public isValidPool;
    
    uint256 public totalPoolsCreated;
    uint256 public activePoolsCount;

    // ── Events ───────────────────────────────────
    event PoolCourseCreated(
        address indexed pool,
        address indexed creator,
        string courseName,
        uint256 timestamp
    );
    
    event PoolDeactivated(address indexed pool, address indexed creator);
    event PoolReactivated(address indexed pool, address indexed creator);

    // ── Errors ───────────────────────────────────
    error EmptyCourseName();
    error InvalidPoolAddress();
    error PoolNotFound();
    error UnauthorizedPoolOperation();

    // ── Constructor ──────────────────────────────
    /**
     * @dev Initializes the factory contract
     */
    constructor() Ownable(msg.sender) {}

    // ── Pool Creation ────────────────────────────
    /**
     * @notice Creates a new PoolCourse contract
     * @param courseName The name of the course for the new pool
     * @return poolAddress The address of the newly created PoolCourse contract
     */
    function createPool(string calldata courseName)
        external
        nonReentrant
        whenNotPaused
        returns (address poolAddress)
    {
        if (bytes(courseName).length == 0) revert EmptyCourseName();

        // Create new PoolCourse contract
        PoolCourse newPool = new PoolCourse(msg.sender, courseName);
        poolAddress = address(newPool);

        // Store pool information
        allPools.push(PoolInfo({
            poolAddress: poolAddress,
            creator: msg.sender,
            courseName: courseName,
            createdAt: block.timestamp,
            isActive: true
        }));

        // Update mappings and counters
        poolsByCreator[msg.sender].push(poolAddress);
        isValidPool[poolAddress] = true;
        totalPoolsCreated++;
        activePoolsCount++;

        emit PoolCourseCreated(poolAddress, msg.sender, courseName, block.timestamp);
    }

    /**
     * @notice Creates multiple pools in a single transaction
     * @param courseNames Array of course names for the new pools
     * @return poolAddresses Array of addresses of the newly created PoolCourse contracts
     */
    function createMultiplePools(string[] calldata courseNames)
        external
        nonReentrant
        whenNotPaused
        returns (address[] memory poolAddresses)
    {
        uint256 length = courseNames.length;
        require(length > 0 && length <= 10, "PoolCourseFactory: invalid batch size");
        
        poolAddresses = new address[](length);

        for (uint256 i = 0; i < length; i++) {
            if (bytes(courseNames[i]).length == 0) revert EmptyCourseName();

            PoolCourse newPool = new PoolCourse(msg.sender, courseNames[i]);
            address poolAddress = address(newPool);
            poolAddresses[i] = poolAddress;

            allPools.push(PoolInfo({
                poolAddress: poolAddress,
                creator: msg.sender,
                courseName: courseNames[i],
                createdAt: block.timestamp,
                isActive: true
            }));

            poolsByCreator[msg.sender].push(poolAddress);
            isValidPool[poolAddress] = true;

            emit PoolCourseCreated(poolAddress, msg.sender, courseNames[i], block.timestamp);
        }

        totalPoolsCreated += length;
        activePoolsCount += length;
    }

    // ── Pool Management ──────────────────────────
    /**
     * @notice Deactivates a pool (only by creator or factory owner)
     * @param poolAddress The address of the pool to deactivate
     */
    function deactivatePool(address poolAddress) external {
        if (!isValidPool[poolAddress]) revert InvalidPoolAddress();
        
        uint256 poolIndex = _findPoolIndex(poolAddress);
        PoolInfo storage pool = allPools[poolIndex];
        
        if (msg.sender != pool.creator && msg.sender != owner()) {
            revert UnauthorizedPoolOperation();
        }
        
        if (pool.isActive) {
            pool.isActive = false;
            activePoolsCount--;
            emit PoolDeactivated(poolAddress, pool.creator);
        }
    }

    /**
     * @notice Reactivates a pool (only by creator or factory owner)
     * @param poolAddress The address of the pool to reactivate
     */
    function reactivatePool(address poolAddress) external {
        if (!isValidPool[poolAddress]) revert InvalidPoolAddress();
        
        uint256 poolIndex = _findPoolIndex(poolAddress);
        PoolInfo storage pool = allPools[poolIndex];
        
        if (msg.sender != pool.creator && msg.sender != owner()) {
            revert UnauthorizedPoolOperation();
        }
        
        if (!pool.isActive) {
            pool.isActive = true;
            activePoolsCount++;
            emit PoolReactivated(poolAddress, pool.creator);
        }
    }

    // ── Admin Functions ──────────────────────────
    /**
     * @notice Pauses the factory contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the factory contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ── View Functions ───────────────────────────
    /**
     * @notice Returns all pools created by the factory
     * @return Array of all pool information
     */
    function getAllPools() external view returns (PoolInfo[] memory) {
        return allPools;
    }

    /**
     * @notice Returns only active pools
     * @return Array of active pool information
     */
    function getActivePools() external view returns (PoolInfo[] memory) {
        PoolInfo[] memory activePools = new PoolInfo[](activePoolsCount);
        uint256 activeIndex = 0;

        for (uint256 i = 0; i < allPools.length; i++) {
            if (allPools[i].isActive) {
                activePools[activeIndex] = allPools[i];
                activeIndex++;
            }
        }

        return activePools;
    }

    /**
     * @notice Returns the total number of pools created
     * @return The total count of pools
     */
    function getPoolCount() external view returns (uint256) {
        return allPools.length;
    }

    /**
     * @notice Returns pools created by a specific address
     * @param creator The address of the pool creator
     * @return Array of pool addresses created by the specified creator
     */
    function getPoolsByCreator(address creator) external view returns (address[] memory) {
        return poolsByCreator[creator];
    }

    /**
     * @notice Returns detailed information about pools created by a specific address
     * @param creator The address of the pool creator
     * @return Array of detailed pool information for the specified creator
     */
    function getPoolInfoByCreator(address creator) external view returns (PoolInfo[] memory) {
        address[] memory creatorPools = poolsByCreator[creator];
        PoolInfo[] memory creatorPoolInfo = new PoolInfo[](creatorPools.length);

        for (uint256 i = 0; i < creatorPools.length; i++) {
            uint256 poolIndex = _findPoolIndex(creatorPools[i]);
            creatorPoolInfo[i] = allPools[poolIndex];
        }

        return creatorPoolInfo;
    }

    /**
     * @notice Returns information about a specific pool
     * @param poolAddress The address of the pool
     * @return The pool information
     */
    function getPoolInfo(address poolAddress) external view returns (PoolInfo memory) {
        if (!isValidPool[poolAddress]) revert InvalidPoolAddress();
        
        uint256 poolIndex = _findPoolIndex(poolAddress);
        return allPools[poolIndex];
    }

    /**
     * @notice Checks if a pool address is valid (created by this factory)
     * @param poolAddress The address to check
     * @return True if the pool is valid, false otherwise
     */
    function isPoolValid(address poolAddress) external view returns (bool) {
        return isValidPool[poolAddress];
    }

    // ── Internal Functions ───────────────────────
    /**
     * @dev Finds the index of a pool in the allPools array
     * @param poolAddress The address of the pool to find
     * @return The index of the pool in the array
     */
    function _findPoolIndex(address poolAddress) internal view returns (uint256) {
        for (uint256 i = 0; i < allPools.length; i++) {
            if (allPools[i].poolAddress == poolAddress) {
                return i;
            }
        }
        revert PoolNotFound();
    }
}