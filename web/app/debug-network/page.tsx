import { NetworkDebug } from "@/components/debug/network-debug";

export default function DebugNetworkPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Network Debug</h1>
          <p className="text-muted-foreground mt-2">
            Debug network switching functionality
          </p>
        </div>

        <div className="flex justify-center">
          <NetworkDebug />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Expected Behavior:</h2>
          <div className="grid gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">1. Connect Wallet</h3>
              <p className="text-sm text-muted-foreground">
                Should connect to MetaMask and show current network
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">2. Check Network</h3>
              <p className="text-sm text-muted-foreground">
                If not on Polkadot Hub Testnet (420420417), "Correct Network" should show "No"
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">3. Switch Network</h3>
              <p className="text-sm text-muted-foreground">
                Should prompt MetaMask to switch to Polkadot Hub Testnet or add it if not present
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Network Details:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong>Name:</strong> Polkadot Hub Testnet</li>
            <li><strong>Chain ID:</strong> 420420417</li>
            <li><strong>Hex Chain ID:</strong> 0x{(420420417).toString(16)}</li>
            <li><strong>RPC URL:</strong> https://eth-rpc-testnet.polkadot.io</li>
            <li><strong>Block Explorer:</strong> https://polkadot-hub-testnet.blockscout.com</li>
          </ul>
        </div>
      </div>
    </div>
  );
}