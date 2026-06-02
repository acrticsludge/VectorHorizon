interface ShimmerSkeletonProps {
  variant: 'card' | 'viewport' | 'thumbnail';
  count?: number;
}

function ShimmerCard() {
  return (
    <div className="flex flex-col gap-3 p-2 rounded-lg bg-[#1c1b1d] border border-[#27272a]">
      <div className="aspect-video w-full rounded bg-[#2a2a2c] animate-shimmer bg-[length:400%_100%]" />
      <div className="flex flex-col gap-2 px-1 pb-1">
        <div className="h-5 w-2/3 rounded bg-[#2a2a2c] animate-shimmer bg-[length:400%_100%]" />
        <div className="h-3 w-1/3 rounded bg-[#2a2a2c] animate-shimmer bg-[length:400%_100%]" />
      </div>
    </div>
  );
}

function ShimmerViewport() {
  return (
    <div className="relative aspect-video w-full max-w-[1200px] bg-[#131315] rounded-lg border border-[#27272a] overflow-hidden">
      <div className="w-full h-full bg-[#2a2a2c] animate-shimmer bg-[length:400%_100%]" />
      <div className="absolute bottom-6 right-6">
        <div className="w-40 h-40 rounded-full bg-[#1c1b1d]/80 border border-[#27272a]/30" />
      </div>
    </div>
  );
}

function ShimmerThumbnail() {
  return (
    <div className="flex items-center gap-4 p-6 border border-[#27272a] rounded-lg bg-[#201f22]">
      <div className="w-20 h-20 rounded border border-[#27272a] bg-[#2a2a2c] animate-shimmer bg-[length:400%_100%]" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 rounded bg-[#2a2a2c] animate-shimmer bg-[length:400%_100%]" />
        <div className="h-3 w-24 rounded bg-[#2a2a2c] animate-shimmer bg-[length:400%_100%]" />
      </div>
    </div>
  );
}

export function ShimmerSkeleton({ variant, count = 1 }: ShimmerSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((i) => <ShimmerCard key={i} />)}
      </div>
    );
  }

  if (variant === 'viewport') return <ShimmerViewport />;

  if (variant === 'thumbnail') return <ShimmerThumbnail />;

  return null;
}
