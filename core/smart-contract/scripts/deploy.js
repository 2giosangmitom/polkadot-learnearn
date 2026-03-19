const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting deployment process...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    
    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

    try {
        // Deploy PoolCourseFactory
        console.log("📦 Deploying PoolCourseFactory...");
        const PoolCourseFactory = await ethers.getContractFactory("PoolCourseFactory");
        const factory = await PoolCourseFactory.deploy();
        await factory.waitForDeployment();
        
        const factoryAddress = await factory.getAddress();
        console.log("✅ PoolCourseFactory deployed to:", factoryAddress);

        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const owner = await factory.owner();
        const totalPools = await factory.getPoolCount();
        
        console.log("👤 Factory owner:", owner);
        console.log("📊 Total pools created:", totalPools.toString());

        // Save deployment information
        const deploymentInfo = {
            network: hre.network.name,
            deployer: deployer.address,
            deployerBalance: ethers.formatEther(balance),
            contracts: {
                PoolCourseFactory: {
                    address: factoryAddress,
                    owner: owner,
                    totalPools: totalPools.toString()
                }
            },
            deploymentTime: new Date().toISOString(),
            blockNumber: await ethers.provider.getBlockNumber()
        };

        // Create deployments directory if it doesn't exist
        const deploymentsDir = path.join(__dirname, "../deployments");
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
        }

        // Save deployment info to file
        const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n💾 Deployment information saved to:", deploymentFile);

        // Create a sample pool for testing
        if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
            console.log("\n🧪 Creating sample pool for testing...");
            const tx = await factory.createPool("Sample Blockchain Course");
            const receipt = await tx.wait();
            
            const event = receipt.logs.find(log => {
                try {
                    return factory.interface.parseLog(log).name === "PoolCourseCreated";
                } catch {
                    return false;
                }
            });
            
            if (event) {
                const parsedEvent = factory.interface.parseLog(event);
                const poolAddress = parsedEvent.args.pool;
                console.log("✅ Sample pool created at:", poolAddress);
                
                // Update deployment info with sample pool
                deploymentInfo.samplePool = {
                    address: poolAddress,
                    courseName: "Sample Blockchain Course",
                    creator: deployer.address
                };
                
                fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
            }
        }

        console.log("\n🎉 Deployment completed successfully!");
        console.log("📋 Summary:");
        console.log("  - Network:", hre.network.name);
        console.log("  - Factory Address:", factoryAddress);
        console.log("  - Gas Used: Check transaction receipt");
        console.log("  - Deployment File:", deploymentFile);

        return {
            factory: factory,
            factoryAddress: factoryAddress,
            deploymentInfo: deploymentInfo
        };

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

// Execute deployment if this script is run directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;