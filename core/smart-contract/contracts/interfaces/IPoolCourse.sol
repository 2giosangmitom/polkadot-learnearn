// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPoolCourse
 * @dev Interface for the PoolCourse contract
 */
interface IPoolCourse {
    // ── Structs ──────────────────────────────────
    struct Sponsor {
        address addr;
        uint256 amount;
        uint256 timestamp;
    }

    // ── Events ───────────────────────────────────
    event Sponsored(address indexed sponsor, uint256 amount, uint256 timestamp);
    event Payback(address indexed student, uint256 amount, uint256 timestamp);
    event CourseNameUpdated(string oldName, string newName);

    // ── Functions ────────────────────────────────
    function sponsor() external payable;
    function payback(address payable student, uint256 amount) external;
    function batchPayback(address payable[] calldata students, uint256[] calldata amounts) external;
    function updateCourseName(string memory _newCourseName) external;
    
    // ── View Functions ───────────────────────────
    function factory() external view returns (address);
    function courseName() external view returns (string memory);
    function totalSponsored() external view returns (uint256);
    function sponsorBalance(address sponsor) external view returns (uint256);
    function getSponsors() external view returns (Sponsor[] memory);
    function getSponsorCount() external view returns (uint256);
    function poolBalance() external view returns (uint256);
    function getSponsorByIndex(uint256 index) external view returns (Sponsor memory);
    function getSponsorBalance(address sponsorAddr) external view returns (uint256);
}