const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoolCourseFactory Contract", function () {
    let PoolCourseFactory, PoolCourse;
    let factory;
    let owner, creator1, creator2, other;

    const COURSE_NAME_1 = "Blockchain Fundamentals";
    const COURSE_NAME_2 = "Smart Contract Security";
    const COURSE_NAME_3 = "DeFi Development";

    beforeEach(async function () {
        [owner, creator1, creator2, other] = await ethers.getSigners();

        PoolCourseFactory = await ethers.getContractFactory("PoolCourseFactory");
        factory = await PoolCourseFactory.deploy();
        await factory.waitForDeployment();

        PoolCourse = await ethers.getContractFactory("PoolCourse");
    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await factory.owner()).to.equal(owner.address);
        });

        it("Should initialize with zero pools", async function () {
            expect(await factory.getPoolCount()).to.equal(0);
            expect(await factory.totalPoolsCreated()).to.equal(0);
            expect(await factory.activePoolsCount()).to.equal(0);
        });
    });

    describe("Pool Creation", function () {
        it("Should create a new pool successfully", async function () {
            await expect(factory.connect(creator1).createPool(COURSE_NAME_1))
                .to.emit(factory, "PoolCourseCreated")
                .withArgs(anyValue, creator1.address, COURSE_NAME_1, anyValue);

            expect(await factory.getPoolCount()).to.equal(1);
            expect(await factory.totalPoolsCreated()).to.equal(1);
            expect(await factory.activePoolsCount()).to.equal(1);
        });

        it("Should reject empty course name", async function () {
            await expect(factory.connect(creator1).createPool(""))
                .to.be.revertedWithCustomError(factory, "EmptyCourseName");
        });

        it("Should create multiple pools for same creator", async function () {
            await factory.connect(creator1).createPool(COURSE_NAME_1);
            await factory.connect(creator1).createPool(COURSE_NAME_2);

            const creatorPools = await factory.getPoolsByCreator(creator1.address);
            expect(creatorPools.length).to.equal(2);
            expect(await factory.getPoolCount()).to.equal(2);
        });

        it("Should create pools for different creators", async function () {
            await factory.connect(creator1).createPool(COURSE_NAME_1);
            await factory.connect(creator2).createPool(COURSE_NAME_2);

            const creator1Pools = await factory.getPoolsByCreator(creator1.address);
            const creator2Pools = await factory.getPoolsByCreator(creator2.address);

            expect(creator1Pools.length).to.equal(1);
            expect(creator2Pools.length).to.equal(1);
            expect(await factory.getPoolCount()).to.equal(2);
        });

        it("Should set correct pool properties", async function () {
            const tx = await factory.connect(creator1).createPool(COURSE_NAME_1);
            const receipt = await tx.wait();
            
            const event = receipt.logs.find(log => {
                try {
                    return factory.interface.parseLog(log).name === "PoolCourseCreated";
                } catch {
                    return false;
                }
            });
            
            const parsedEvent = factory.interface.parseLog(event);
            const poolAddress = parsedEvent.args.pool;

            // Check if pool is valid
            expect(await factory.isValidPool(poolAddress)).to.be.true;

            // Get pool info
            const poolInfo = await factory.getPoolInfo(poolAddress);
            expect(poolInfo.creator).to.equal(creator1.address);
            expect(poolInfo.courseName).to.equal(COURSE_NAME_1);
            expect(poolInfo.isActive).to.be.true;

            // Check pool contract properties
            const poolContract = PoolCourse.attach(poolAddress);
            expect(await poolContract.owner()).to.equal(creator1.address);
            expect(await poolContract.courseName()).to.equal(COURSE_NAME_1);
            expect(await poolContract.factory()).to.equal(await factory.getAddress());
        });
    });

    describe("Batch Pool Creation", function () {
        it("Should create multiple pools in one transaction", async function () {
            const courseNames = [COURSE_NAME_1, COURSE_NAME_2, COURSE_NAME_3];
            
            const tx = await factory.connect(creator1).createMultiplePools(courseNames);
            const receipt = await tx.wait();

            // Check events
            const events = receipt.logs.filter(log => {
                try {
                    return factory.interface.parseLog(log).name === "PoolCourseCreated";
                } catch {
                    return false;
                }
            });

            expect(events.length).to.equal(3);
            expect(await factory.getPoolCount()).to.equal(3);
            expect(await factory.totalPoolsCreated()).to.equal(3);
            expect(await factory.activePoolsCount()).to.equal(3);
        });

        it("Should reject empty batch", async function () {
            await expect(factory.connect(creator1).createMultiplePools([]))
                .to.be.revertedWith("PoolCourseFactory: invalid batch size");
        });

        it("Should reject batch with empty course name", async function () {
            const courseNames = [COURSE_NAME_1, "", COURSE_NAME_3];
            
            await expect(factory.connect(creator1).createMultiplePools(courseNames))
                .to.be.revertedWithCustomError(factory, "EmptyCourseName");
        });

        it("Should reject batch size exceeding limit", async function () {
            const courseNames = new Array(11).fill("Course Name");
            
            await expect(factory.connect(creator1).createMultiplePools(courseNames))
                .to.be.revertedWith("PoolCourseFactory: invalid batch size");
        });
    });

    describe("Pool Management", function () {
        let poolAddress;

        beforeEach(async function () {
            const tx = await factory.connect(creator1).createPool(COURSE_NAME_1);
            const receipt = await tx.wait();
            
            const event = receipt.logs.find(log => {
                try {
                    return factory.interface.parseLog(log).name === "PoolCourseCreated";
                } catch {
                    return false;
                }
            });
            
            poolAddress = factory.interface.parseLog(event).args.pool;
        });

        it("Should allow creator to deactivate pool", async function () {
            await expect(factory.connect(creator1).deactivatePool(poolAddress))
                .to.emit(factory, "PoolDeactivated")
                .withArgs(poolAddress, creator1.address);

            const poolInfo = await factory.getPoolInfo(poolAddress);
            expect(poolInfo.isActive).to.be.false;
            expect(await factory.activePoolsCount()).to.equal(0);
        });

        it("Should allow factory owner to deactivate pool", async function () {
            await expect(factory.connect(owner).deactivatePool(poolAddress))
                .to.emit(factory, "PoolDeactivated")
                .withArgs(poolAddress, creator1.address);

            const poolInfo = await factory.getPoolInfo(poolAddress);
            expect(poolInfo.isActive).to.be.false;
        });

        it("Should reject deactivation from unauthorized user", async function () {
            await expect(factory.connect(other).deactivatePool(poolAddress))
                .to.be.revertedWithCustomError(factory, "UnauthorizedPoolOperation");
        });

        it("Should allow reactivation of deactivated pool", async function () {
            await factory.connect(creator1).deactivatePool(poolAddress);
            
            await expect(factory.connect(creator1).reactivatePool(poolAddress))
                .to.emit(factory, "PoolReactivated")
                .withArgs(poolAddress, creator1.address);

            const poolInfo = await factory.getPoolInfo(poolAddress);
            expect(poolInfo.isActive).to.be.true;
            expect(await factory.activePoolsCount()).to.equal(1);
        });

        it("Should reject operations on invalid pool address", async function () {
            const invalidAddress = ethers.Wallet.createRandom().address;
            
            await expect(factory.connect(creator1).deactivatePool(invalidAddress))
                .to.be.revertedWithCustomError(factory, "InvalidPoolAddress");
        });
    });

    describe("Pause Functionality", function () {
        it("Should allow owner to pause and unpause factory", async function () {
            await factory.connect(owner).pause();
            expect(await factory.paused()).to.be.true;

            await factory.connect(owner).unpause();
            expect(await factory.paused()).to.be.false;
        });

        it("Should prevent pool creation when paused", async function () {
            await factory.connect(owner).pause();
            
            await expect(factory.connect(creator1).createPool(COURSE_NAME_1))
                .to.be.revertedWithCustomError(factory, "EnforcedPause");
        });

        it("Should reject pause from non-owner", async function () {
            await expect(factory.connect(other).pause())
                .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            await factory.connect(creator1).createPool(COURSE_NAME_1);
            await factory.connect(creator1).createPool(COURSE_NAME_2);
            await factory.connect(creator2).createPool(COURSE_NAME_3);
        });

        it("Should return all pools", async function () {
            const allPools = await factory.getAllPools();
            expect(allPools.length).to.equal(3);
            
            expect(allPools[0].creator).to.equal(creator1.address);
            expect(allPools[0].courseName).to.equal(COURSE_NAME_1);
            expect(allPools[1].creator).to.equal(creator1.address);
            expect(allPools[1].courseName).to.equal(COURSE_NAME_2);
            expect(allPools[2].creator).to.equal(creator2.address);
            expect(allPools[2].courseName).to.equal(COURSE_NAME_3);
        });

        it("Should return active pools only", async function () {
            const allPools = await factory.getAllPools();
            await factory.connect(creator1).deactivatePool(allPools[0].poolAddress);

            const activePools = await factory.getActivePools();
            expect(activePools.length).to.equal(2);
            expect(await factory.activePoolsCount()).to.equal(2);
        });

        it("Should return pools by creator", async function () {
            const creator1Pools = await factory.getPoolsByCreator(creator1.address);
            const creator2Pools = await factory.getPoolsByCreator(creator2.address);

            expect(creator1Pools.length).to.equal(2);
            expect(creator2Pools.length).to.equal(1);
        });

        it("Should return detailed pool info by creator", async function () {
            const creator1PoolInfo = await factory.getPoolInfoByCreator(creator1.address);
            
            expect(creator1PoolInfo.length).to.equal(2);
            expect(creator1PoolInfo[0].courseName).to.equal(COURSE_NAME_1);
            expect(creator1PoolInfo[1].courseName).to.equal(COURSE_NAME_2);
        });

        it("Should return empty array for creator with no pools", async function () {
            const noPools = await factory.getPoolsByCreator(other.address);
            expect(noPools.length).to.equal(0);
        });

        it("Should validate pool addresses correctly", async function () {
            const allPools = await factory.getAllPools();
            const validPool = allPools[0].poolAddress;
            const invalidPool = ethers.Wallet.createRandom().address;

            expect(await factory.isPoolValid(validPool)).to.be.true;
            expect(await factory.isPoolValid(invalidPool)).to.be.false;
        });
    });

    describe("Integration Tests", function () {
        it("Should create pool and allow sponsoring", async function () {
            const tx = await factory.connect(creator1).createPool(COURSE_NAME_1);
            const receipt = await tx.wait();
            
            const event = receipt.logs.find(log => {
                try {
                    return factory.interface.parseLog(log).name === "PoolCourseCreated";
                } catch {
                    return false;
                }
            });
            
            const poolAddress = factory.interface.parseLog(event).args.pool;
            const poolContract = PoolCourse.attach(poolAddress);

            // Sponsor the pool
            const sponsorAmount = ethers.parseEther("1.0");
            await poolContract.connect(other).sponsor({ value: sponsorAmount });

            expect(await poolContract.totalSponsored()).to.equal(sponsorAmount);
            expect(await poolContract.poolBalance()).to.equal(sponsorAmount);
        });
    });

    // Helper for testing events with any value
    const anyValue = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
});