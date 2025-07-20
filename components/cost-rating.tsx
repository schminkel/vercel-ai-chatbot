import { CoinIcon } from './icons';

interface CostRatingProps {
  coins: number; // 0.5 to 4 with 0.5 increments
  fixedCost?: number; // For image models, cost per image in EUR
  size?: number;
}

export function CostRating({ coins, fixedCost, size = 12 }: CostRatingProps) {
  const totalCoins = 4;
  const coinElements = [];

  for (let i = 0; i < totalCoins; i++) {
    const coinValue = i + 1;
    
    if (coins >= coinValue) {
      // Full coin - use current text color
      coinElements.push(
        <div key={i} className="text-foreground">
          <CoinIcon size={size} />
        </div>
      );
    } else if (coins >= coinValue - 0.5) {
      // Half coin - create a visual half effect
      coinElements.push(
        <div key={i} className="relative">
          <div className="text-muted-foreground/20">
            <CoinIcon size={size} />
          </div>
          <div 
            className="absolute inset-0 overflow-hidden text-foreground"
            style={{ clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)' }}
          >
            <CoinIcon size={size} />
          </div>
        </div>
      );
    } else {
      // Empty coin - very light gray
      coinElements.push(
        <div key={i} className="text-muted-foreground/20">
          <CoinIcon size={size} />
        </div>
      );
    }
  }

  return (
    <div className="flex items-end justify-end gap-1 shrink-0">
      {fixedCost && (
        <span className="text-[10px] font-medium text-muted-foreground leading-none mb-1.1">
          {fixedCost.toFixed(2)} € per image
        </span>
      )}
      <div className="flex gap-0.5 items-center">
        {coinElements}
      </div>
    </div>
  );
}
