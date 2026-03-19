const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔗 Starting contract interaction...\n");

    // Get signers
    const [deployer, sponsor1, sponsor2, student1, student2] = await ethers.getSigners();
    
    console.log("👥 Available accounts:");
    console.log("  Deployer:", deployer.address);
    console.log("  Sponsor 1:", sponsor1.address);
    console.log("  Sponsor 2:", sponsor2.address);
    console.log("  Student 1:", student1.address);
    console.log("  Student 2:", student2.address, "\n");

    try {
        const factoryAddress = "0x62Bdb9A8Fed36e22272CA96661eB3F600e8f8F13";

        console.log("📦 Loading PoolCourseFactory from:", factoryAddress);

        // Get contract instances
        const PoolCourseFactory = await ethers.getContractFactory("PoolCourseFactory");
        const factory = PoolCourseFactory.attach(factoryAddress);

        const PoolCourse = await ethers.getContractFactory("PoolCourse");

        // Test 1: Create a new pool
        console.log("\n🧪 Test 1: Creating a new course pool...");
        const createTx = await factory.connect(deployer).createPool("Advanced Smart Contract Development");
        const createReceipt = await createTx.wait();
        
        // Get the created pool address from events
        const createEvent = createReceipt.logs.find(log => {
            try {
                return factory.interface.parseLog(log).name === "PoolCourseCreated";
            } catch {
                return false;
            }
        });

        const parsedCreateEvent = factory.interface.parseLog(createEvent);
        const newPoolAddress = parsedCreateEvent.args.pool;
        console.log("✅ New pool created at:", newPoolAddress);

        // Get pool contract instance
        const poolContract = PoolCourse.attach(newPoolAddress);

        // Test 2: Sponsor the course
        console.log("\n🧪 Test 2: Sponsoring the course...");
        
        // Sponsor 1 contributes 1 ETH
        const sponsor1Amount = ethers.parseEther("1.0");
        const sponsor1Tx = await poolContract.connect(sponsor1).sponsor({ value: sponsor1Amount });
        await sponsor1Tx.wait();
        console.log("✅ Sponsor 1 contributed:", ethers.formatEther(sponsor1Amount), "ETH");

        // Sponsor 2 contributes 0.5 ETH
        const sponsor2Amount = ethers.parseEther("0.5");
        const sponsor2Tx = await poolContract.connect(sponsor2).sponsor({ value: sponsor2Amount });
        await sponsor2Tx.wait();
        console.log("✅ Sponsor 2 contributed:", ethers.formatEther(sponsor2Amount), "ETH");

        // Check pool status
        const totalSponsored = await poolContract.totalSponsored();
        const poolBalance = await poolContract.poolBalance();
        const sponsorCount = await poolContract.getSponsorCount();

        console.log("\n📊 Pool Status:");
        console.log("  Total Sponsored:", ethers.formatEther(totalSponsored), "ETH");
        console.log("  Pool Balance:", ethers.formatEther(poolBalance), "ETH");
        console.log("  Number of Sponsors:", sponsorCount.toString());

        // Test 3: Get sponsor information
        console.log("\n🧪 Test 3: Retrieving sponsor information...");
        const sponsors = await poolContract.getSponsors();
        
        sponsors.forEach((sponsor, index) => {
            console.log(`  Sponsor ${index + 1}:`);
            console.log(`    Address: ${sponsor.addr}`);
            console.log(`    Amount: ${ethers.formatEther(sponsor.amount)} ETH`);
            console.log(`    Timestamp: ${new Date(Number(sponsor.timestamp) * 1000).toLocaleString()}`);
        });

        // Test 4: Pay back students
        console.log("\n🧪 Test 4: Paying back students...");
        
        // Pay back student 1
        const payback1Amount = ethers.parseEther("0.3");
        const payback1Tx = await poolContract.connect(deployer).payback(student1.address, payback1Amount);
        await payback1Tx.wait();
        console.log("✅ Paid back to Student 1:", ethers.formatEther(payback1Amount), "ETH");

        // Pay back student 2
        const payback2Amount = ethers.parseEther("0.2");
        const payback2Tx = await poolContract.connect(deployer).payback(student2.address, payback2Amount);
        await payback2Tx.wait();
        console.log("✅ Paid back to Student 2:", ethers.formatEther(payback2Amount), "ETH");

        // Test 5: Batch payback
        console.log("\n🧪 Test 5: Testing batch payback...");
        const batchStudents = [student1.address, student2.address];
        const batchAmounts = [ethers.parseEther("0.1"), ethers.parseEther("0.15")];
        
        const batchTx = await poolContract.connect(deployer).batchPayback(batchStudents, batchAmounts);
        await batchTx.wait();
        console.log("✅ Batch payback completed");

        // Final pool status
        const finalBalance = await poolContract.poolBalance();
        console.log("\n📊 Final Pool Balance:", ethers.formatEther(finalBalance), "ETH");

        // Test 6: Factory statistics
        console.log("\n🧪 Test 6: Factory statistics...");
        const totalPools = await factory.getPoolCount();
        const activePools = await factory.activePoolsCount();
        const deployerPools = await factory.getPoolsByCreator(deployer.address);

        console.log("📈 Factory Statistics:");
        console.log("  Total Pools Created:", totalPools.toString());
        console.log("  Active Pools:", activePools.toString());
        console.log("  Deployer's Pools:", deployerPools.length);

        // Test 7: Get all pools information
        console.log("\n🧪 Test 7: Retrieving all pools...");
        const allPools = await factory.getAllPools();
        
        console.log("📋 All Pools:");
        allPools.forEach((pool, index) => {
            console.log(`  Pool ${index + 1}:`);
            console.log(`    Address: ${pool.poolAddress}`);
            console.log(`    Creator: ${pool.creator}`);
            console.log(`    Course: ${pool.courseName}`);
            console.log(`    Created: ${new Date(Number(pool.createdAt) * 1000).toLocaleString()}`);
            console.log(`    Active: ${pool.isActive}`);
        });

        console.log("\n🎉 All tests completed successfully!");

        // Save interaction results
        const interactionResults = {
            network: hre.network.name,
            timestamp: new Date().toISOString(),
            factoryAddress: factoryAddress,
            newPoolAddress: newPoolAddress,
            totalSponsored: ethers.formatEther(totalSponsored),
            finalPoolBalance: ethers.formatEther(finalBalance),
            totalPools: totalPools.toString(),
            activePools: activePools.toString(),
            sponsors: sponsors.map(s => ({
                address: s.addr,
                amount: ethers.formatEther(s.amount),
                timestamp: new Date(Number(s.timestamp) * 1000).toISOString()
            }))
        };

        const resultsFile = path.join(__dirname, "../deployments", `${hre.network.name}-interaction-results.json`);
        fs.writeFileSync(resultsFile, JSON.stringify(interactionResults, null, 2));
        console.log("💾 Interaction results saved to:", resultsFile);

    } catch (error) {
        console.error("❌ Interaction failed:", error);
        throw error;
    }
}

// Execute interaction if this script is run directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;