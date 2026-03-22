type BrandLogoProps = {
  className?: string;
  compact?: boolean;
};

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <div className={className}>
      <img
        alt="DashSpec"
        className={compact ? 'brand-image brand-image-compact' : 'brand-image brand-image-full'}
        src="/branding/logo-transparent.svg"
      />
    </div>
  );
}
