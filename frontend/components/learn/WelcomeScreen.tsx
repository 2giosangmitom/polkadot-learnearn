import { WalletButton } from '@/components/wallet';

interface WelcomeScreenProps {
  onConnect: (address: string, balance: string) => void;
}

export function WelcomeScreen({ onConnect }: WelcomeScreenProps) {
  return (
    <div className="bg-card rounded-xl p-12 shadow-xl border-2 border-secondary text-center">
      <h2 className="text-3xl font-bold text-primary mb-4">
        Welcome to Learn & Earn! 🚀
      </h2>
      <p className="text-lg text-foreground mb-8">
        Connect your Polkadot wallet to start learning and earning PAS rewards
      </p>
      <div className="flex justify-center">
        <WalletButton onConnect={onConnect} />
      </div>
    </div>
  );
}
