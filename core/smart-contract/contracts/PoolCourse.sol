// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PoolCourse
 * @dev A contract that allows sponsors to fund a course and enables the course owner to pay back students
 * @notice This contract manages course funding through sponsors and student paybacks
 */
contract PoolCourse is Ownable, ReentrancyGuard, Pausable {
    // ── State Variables ──────────────────────────
    address public immutable factory;
    string public courseName;
    uint256 public totalSponsored;

    struct Sponsor {
        address addr;
        uint256 amount;
        uint256 timestamp;
    }

    Sponsor[] private sponsors;
    mapping(address => uint256) public sponsorBalance;

    // ── Events ───────────────────────────────────
    event Sponsored(address indexed sponsor, uint256 amount, uint256 timestamp);
    event Payback(address indexed student, uint256 amount, uint256 timestamp);
    event CourseNameUpdated(string oldName, string newName);

    // ── Errors ───────────────────────────────────
    error InvalidAmount();
    error InvalidAddress();
    error InsufficientBalance();
    error EmptyCourseName();

    // ── Constructor ──────────────────────────────
    /**
     * @dev Initializes the contract with owner and course name
     * @param _owner The address that will own this pool course
     * @param _courseName The name of the course
     */
    constructor(address _owner, string memory _courseName) Ownable(_owner) {
        if (bytes(_courseName).length == 0) revert EmptyCourseName();
        
        factory = msg.sender;
        courseName = _courseName;
    }

    // ── Sponsor Functions ────────────────────────
    /**
     * @notice Allows sponsors to fund the course by sending ETH
     * @dev Sponsors can call this function multiple times to increase their contribution
     */
    function sponsor() external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert InvalidAmount();

        sponsors.push(Sponsor({
            addr: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        sponsorBalance[msg.sender] += msg.value;
        totalSponsored += msg.value;

        emit Sponsored(msg.sender, msg.value, block.timestamp);
    }

    // ── Payback Functions ────────────────────────
    /**
     * @notice Allows the owner to pay back students from the sponsored funds
     * @param student The address of the student to receive the payback
     * @param amount The amount in wei to pay back to the student
     */
    function payback(address payable student, uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
        whenNotPaused 
    {
        if (student == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (address(this).balance < amount) revert InsufficientBalance();

        (bool success, ) = student.call{value: amount}("");
        require(success, "PoolCourse: transfer failed");

        emit Payback(student, amount, block.timestamp);
    }

    /**
     * @notice Allows the owner to pay back multiple students in a single transaction
     * @param students Array of student addresses
     * @param amounts Array of amounts corresponding to each student
     */
    function batchPayback(address payable[] calldata students, uint256[] calldata amounts)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        if (students.length != amounts.length) revert InvalidAmount();
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        if (address(this).balance < totalAmount) revert InsufficientBalance();

        for (uint256 i = 0; i < students.length; i++) {
            if (students[i] == address(0)) revert InvalidAddress();
            if (amounts[i] == 0) revert InvalidAmount();

            (bool success, ) = students[i].call{value: amounts[i]}("");
            require(success, "PoolCourse: transfer failed");

            emit Payback(students[i], amounts[i], block.timestamp);
        }
    }

    // ── Admin Functions ──────────────────────────
    /**
     * @notice Allows the owner to update the course name
     * @param _newCourseName The new name for the course
     */
    function updateCourseName(string memory _newCourseName) external onlyOwner {
        if (bytes(_newCourseName).length == 0) revert EmptyCourseName();
        
        string memory oldName = courseName;
        courseName = _newCourseName;
        
        emit CourseNameUpdated(oldName, _newCourseName);
    }

    /**
     * @notice Allows the owner to pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Allows the owner to unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ── View Functions ───────────────────────────
    /**
     * @notice Returns the complete list of sponsors
     * @return Array of all sponsors with their details
     */
    function getSponsors() external view returns (Sponsor[] memory) {
        return sponsors;
    }

    /**
     * @notice Returns the total number of sponsorship transactions
     * @return The count of sponsor transactions
     */
    function getSponsorCount() external view returns (uint256) {
        return sponsors.length;
    }

    /**
     * @notice Returns the current ETH balance in the pool
     * @return The contract's current balance in wei
     */
    function poolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Returns sponsor information by index
     * @param index The index of the sponsor in the array
     * @return The sponsor details at the given index
     */
    function getSponsorByIndex(uint256 index) external view returns (Sponsor memory) {
        require(index < sponsors.length, "PoolCourse: index out of bounds");
        return sponsors[index];
    }

    /**
     * @notice Returns the total amount sponsored by a specific address
     * @param sponsorAddr The address of the sponsor
     * @return The total amount sponsored by the address
     */
    function getSponsorBalance(address sponsorAddr) external view returns (uint256) {
        return sponsorBalance[sponsorAddr];
    }
}