export function VindicaMark({ size = 32, variant = 'default' }: { size?: number; variant?: 'default' | 'dark' }) {
  const fill = variant === 'dark' ? '#8B72E8' : '#5B3FD4';
  const stroke = variant === 'dark' ? '#8B72E8' : '#5B3FD4';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Horizontal bar */}
      <rect x="0" y="44" width="120" height="32" rx="16"
            fill={fill} fillOpacity="0.15"
            stroke={stroke} strokeWidth="1.5" strokeOpacity="0.5"/>
      {/* Vertical bar */}
      <rect x="44" y="0" width="32" height="120" rx="16"
            fill={fill} fillOpacity="0.15"
            stroke={stroke} strokeWidth="1.5" strokeOpacity="0.5"/>
      {/* Center dot */}
      <circle cx="60" cy="60" r="14" fill={fill}/>
      {/* Four accent dots */}
      <circle cx="12"  cy="60" r="5" fill={fill} fillOpacity="0.35"/>
      <circle cx="108" cy="60" r="5" fill={fill} fillOpacity="0.35"/>
      <circle cx="60"  cy="12" r="5" fill={fill} fillOpacity="0.35"/>
      <circle cx="60"  cy="108" r="5" fill={fill} fillOpacity="0.35"/>
    </svg>
  );
}
