const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoolCourse Contract", function () {
    let PoolCourse, PoolCourseFactory;
    let poolCourse, factory;
    let owner, sponsor1, sponsor2, student1, student2, other;

    const COURSE_NAME = "Blockchain Development Bootcamp";
    const SPONSOR_AMOUNT_1 = ethers.parseEther("1.0");
    const SPONSOR_AMOUNT_2 = ethers.parseEther("0.5");
    const PAYBACK_AMOUNT = ethers.parseEther("0.3");

    beforeEach(async function () {
        // Get signers
        [owner, sponsor1, sponsor2, student1, student2, other] = await ethers.getSigners();

        // Deploy Factory
        PoolCourseFactory = await ethers.getContractFactory("PoolCourseFactory");
        factory = await PoolCourseFactory.deploy();
        await factory.waitForDeployment();

        // Create a pool through factory
        const tx = await factory.connect(owner).createPool(COURSE_NAME);
        const receipt = await tx.wait();
        
        // Get pool address from event
        const event = receipt.logs.find(log => {
            try {
                return factory.interface.parseLog(log).name === "PoolCourseCreated";
            } catch {
                return false;
            }
        });
        
        const parsedEvent = factory.interface.parseLog(event);
        const poolAddress = parsedEvent.args.pool;

        // Get pool contract instance
        PoolCourse = await ethers.getContractFactory("PoolCourse");
        poolCourse = PoolCourse.attach(poolAddress);
    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await poolCourse.owner()).to.equal(owner.address);
        });

        it("Should set the correct factory address", async function () {
            expect(await poolCourse.factory()).to.equal(await factory.getAddress());
        });

        it("Should set the correct course name", async function () {
            expect(await poolCourse.courseName()).to.equal(COURSE_NAME);
        });

        it("Should initialize with zero sponsored amount", async function () {
            expect(await poolCourse.totalSponsored()).to.equal(0);
        });

        it("Should initialize with zero pool balance", async function () {
            expect(await poolCourse.poolBalance()).to.equal(0);
        });
    });

    describe("Sponsoring", function () {
        it("Should allow sponsors to contribute ETH", async function () {
            await expect(poolCourse.connect(sponsor1).sponsor({ value: SPONSOR_AMOUNT_1 }))
                .to.emit(poolCourse, "Sponsored")
                .withArgs(sponsor1.address, SPONSOR_AMOUNT_1, anyValue);

            expect(await poolCourse.totalSponsored()).to.equal(SPONSOR_AMOUNT_1);
            expect(await poolCourse.poolBalance()).to.equal(SPONSOR_AMOUNT_1);
            expect(await poolCourse.sponsorBalance(sponsor1.address)).to.equal(SPONSOR_AMOUNT_1);
        });

        it("Should allow multiple sponsors", async function () {
            await poolCourse.connect(sponsor1).sponsor({ value: SPONSOR_AMOUNT_1 });
            await poolCourse.connect(sponsor2).sponsor({ value: SPONSOR_AMOUNT_2 });

            expect(await poolCourse.totalSponsored()).to.equal(SPONSOR_AMOUNT_1 + SPONSOR_AMOUNT_2);
            expect(await poolCourse.getSponsorCount()).to.equal(2);
        });

        it("Should allow same sponsor to contribute multiple times", async function () {
            await poolCourse.connect(sponsor1).sponsor({ value: SPONSOR_AMOUNT_1 });
            await poolCourse.connect(sponsor1).sponsor({ value: SPONSOR_AMOUNT_2 });

            expect(await poolCourse.sponsorBalance(sponsor1.address)).to.equal(SPONSOR_AMOUNT_1 + SPONSOR_AMOUNT_2);
            expect(await poolCourse.getSponsorCount()).to.equal(2);
        });

        it("Should reject zero value sponsorship", async function () {
            await expect(poolCourse.connect(sponsor1).sponsor({ value: 0 }))
                .to.be.revertedWithCustomError(poolCourse, "InvalidAmount");
        });

        it("Should store sponsor information correctly", async function () {
            await poolCourse.connect(sponsor1).sponsor({ value: SPONSOR_AMOUNT_1 });
            
            const sponsors = await poolCourse.getSponsors();
            expect(sponsors.length).to.equal(1);
            expect(sponsors[0].addr).to.equal(sponsor1.address);
            expect(sponsors[0].amount).to.equal(SPONSOR_AMOUNT_1);
        });
    });

    describe("Payback", function () {
        beforeEach(async function () {
            // Add some sponsorship first
            await poolCourse.connect(sponsor1).sponsor({ value: SPONSOR_AMOUNT_1 });
            await poolCourse.connect(sponsor2).sponsor({ value: SPONSOR_AMOUNT_2 });
        });

        it("Should allow owner to pay back students", async function () {
            await expect(poolCourse.connect(owner).payback(student1.address, PAYBACK_AMOUNT))
                .to.emit(poolCourse, "Payback")
                .withArgs(student1.address, PAYBACK_AMOUNT, anyValue);

            const expectedBalance = SPONSOR_AMOUNT_1 + SPONSOR_AMOUNT_2 - PAYBACK_AMOUNT;
            expect(await poolCourse.poolBalance()).to.equal(expectedBalance);
        });

        it("Should reject payback from non-owner", async function () {
            await expect(poolCourse.connect(other).payback(student1.address, PAYBACK_AMOUNT))
                .to.be.revertedWithCustomError(poolCourse, "OwnableUnauthorizedAccount");
        });

        it("Should reject payback to zero address", async function () {
            await expect(poolCourse.connect(owner).payback(ethers.ZeroAddress, PAYBACK_AMOUNT))
                .to.be.revertedWithCustomError(poolCourse, "InvalidAddress");
        });

        it("Should reject zero amount payback", async function () {
            await expect(poolCourse.connect(owner).payback(student1.address, 0))
                .to.be.revertedWithCustomError(poolCourse, "InvalidAmount");
        });

        it("Should reject payback exceeding pool balance", async function () {
            const excessiveAmount = SPONSOR_AMOUNT_1 + SPONSOR_AMOUNT_2 + ethers.parseEther("1.0");
            await expect(poolCourse.connect(owner).payback(student1.address, excessiveAmount))
                .to.be.revertedWithCustomError(poolCourse, "InsufficientBalance");
        });
    });

    describe("Batch Payback", function () {
        beforeEach(async function () {
            await poolCourse.connect(sponsor1).sponsor({ value: ethers.parseEther("2.0") });
        });

        it("Should allow batch payback to multiple students", async function () {
            const students = [student1.address, student2.address];
            const amounts = [ethers.parseEther("0.3"), ethers.parseEther("0.2")];

            await expect(poolCourse.connect(owner).batchPayback(students, amounts))
                .to.emit(poolCourse, "Payback")
                .withArgs(student1.address, amounts[0], anyValue)
                .and.to.emit(poolCourse, "Payback")
                .withArgs(student2.address, amounts[1], anyValue);
        });

        it("Should reject batch payback with mismatched arrays", async function () {
            const students = [student1.address, student2.address];
            const amounts = [ethers.parseEther("0.3")]; // Different length

            await expect(poolCourse.connect(owner).batchPayback(students, amounts))
                .to.be.revertedWithCustomError(poolCourse, "InvalidAmount");
        });

        it("Should reject batch payback exceeding total balance", async function () {
            const students = [student1.address, student2.address];
            const amounts = [ethers.parseEther("1.5"), ethers.parseEther("1.0")]; // Total > 2.0 ETH

            await expect(poolCourse.connect(owner).batchPayback(students, amounts))
                .to.be.revertedWithCustomError(poolCourse, "InsufficientBalance");
        });
    });

    describe("Course Management", function () {
        it("Should allow owner to update course name", async function () {
            const newName = "Advanced Blockchain Development";
            
            await expect(poolCourse.connect(owner).updateCourseName(newName))
                .to.emit(poolCourse, "CourseNameUpdated")
                .withArgs(COURSE_NAME, newName);

            expect(await poolCourse.courseName()).to.equal(newName);
        });

        it("Should reject empty course name update", async function () {
            await expect(poolCourse.connect(owner).updateCourseName(""))
                .to.be.revertedWithCustomError(poolCourse, "EmptyCourseName");
        });

        it("Should reject course name update from non-owner", async function () {
            await expect(poolCourse.connect(other).updateCourseName("New Name"))
                .to.be.revertedWithCustomError(poolCourse, "OwnableUnauthorizedAccount");
        });
    });

    describe("Pause Functionality", function () {
        it("Should allow owner to pause and unpause", async function () {
            await poolCourse.connect(owner).pause();
            expect(await poolCourse.paused()).to.be.true;

            await poolCourse.connect(owner).unpause();
            expect(await poolCourse.paused()).to.be.false;
        });

        it("Should prevent sponsoring when paused", async function () {
            await poolCourse.connect(owner).pause();
            
            await expect(poolCourse.connect(sponsor1).sponsor({ value: SPONSOR_AMOUNT_1 }))
                .to.be.revertedWithCustomError(poolCourse, "EnforcedPause");
        });

        it("Should prevent payback when paused", async function () {
            await poolCourse.connect(sponsor1).sponsor({ value: SPONSOR_AMOUNT_1 });
            await poolCourse.connect(owner).pause();
            
            await expect(poolCourse.connect(owner).payback(student1.address, PAYBACK_AMOUNT))
                .to.be.revertedWithCustomError(poolCourse, "EnforcedPause");
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            await poolCourse.connect(sponsor1).sponsor({ value: SPONSOR_AMOUNT_1 });
            await poolCourse.connect(sponsor2).sponsor({ value: SPONSOR_AMOUNT_2 });
        });

        it("Should return correct sponsor information", async function () {
            const sponsor = await poolCourse.getSponsorByIndex(0);
            expect(sponsor.addr).to.equal(sponsor1.address);
            expect(sponsor.amount).to.equal(SPONSOR_AMOUNT_1);
        });

        it("Should return correct sponsor balance", async function () {
            expect(await poolCourse.getSponsorBalance(sponsor1.address)).to.equal(SPONSOR_AMOUNT_1);
            expect(await poolCourse.getSponsorBalance(sponsor2.address)).to.equal(SPONSOR_AMOUNT_2);
        });

        it("Should revert when accessing invalid sponsor index", async function () {
            await expect(poolCourse.getSponsorByIndex(10))
                .to.be.revertedWith("PoolCourse: index out of bounds");
        });
    });

    // Helper function for testing events with timestamps
    const anyValue = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
});