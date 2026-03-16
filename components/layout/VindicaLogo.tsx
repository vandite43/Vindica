import { VindicaMark } from './VindicaMark';

export function VindicaLogo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <VindicaMark size={80} />
      <div className="text-center">
        <h1 style={{ fontFamily: 'Trebuchet MS, Segoe UI, sans-serif' }}
            className="text-5xl font-bold tracking-tight text-midnight">
          Vindi<span className="text-primary">ca</span>
        </h1>
        <p className="text-xs tracking-[0.3em] text-primary/55 mt-1">
          INTELLIGENT CLAIMS RECOVERY
        </p>
        <div className="w-32 h-px bg-primary/20 mx-auto my-3"/>
        <p className="text-sm font-light text-midnight/40 tracking-wide">
          Reclaim what is rightfully yours.
        </p>
      </div>
    </div>
  );
}
