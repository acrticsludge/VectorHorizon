export function Footer() {
  return (
    <footer className="flex flex-col md:flex-row justify-between items-center py-8 px-[16px] w-full mt-auto border-t border-[#27272a] bg-[#131315]">
      <div className="text-[12px] leading-[1.0] tracking-[0.05em] uppercase text-[#71717a] mb-4 md:mb-0">
        Powered by NVIDIA Cosmos 3 - Clerk Auth - Supabase
      </div>
      <div className="flex gap-8">
        <a href="/terms" className="text-[12px] leading-[1.0] tracking-[0.05em] text-[#71717a] hover:text-white transition-colors">
          Terms
          <span className="ml-1 text-[10px] text-[#71717a]">(Coming Soon)</span>
        </a>
        <a href="/privacy" className="text-[12px] leading-[1.0] tracking-[0.05em] text-[#71717a] hover:text-white transition-colors">
          Privacy
          <span className="ml-1 text-[10px] text-[#71717a]">(Coming Soon)</span>
        </a>
      </div>
      <div className="text-[12px] leading-[1.0] tracking-[0.05em] text-[#71717a] mt-4 md:mt-0">
        (c) VectorHorizon. Technical Minimalism.
      </div>
    </footer>
  );
}
