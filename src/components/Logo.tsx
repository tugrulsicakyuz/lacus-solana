interface LogoProps {
  size?: 'nav' | 'footer' | 'cta';
  className?: string;
}

export default function Logo({ size = 'nav', className = '' }: LogoProps) {
  const dimensions = {
    nav: 40,
    footer: 32,
    cta: 120,
  };

  const dim = dimensions[size];

  if (size === 'cta') {
    return (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ctaGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="48%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <radialGradient id="pondGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#c4b5fd" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.0" />
          </radialGradient>
        </defs>
        
        <circle cx="20" cy="20" r="17.5" stroke="url(#ctaGrad)" strokeWidth="0.5" fill="none" opacity="0.22" />
        
        <g className="cta-logo-orbit">
          <ellipse
            cx="20"
            cy="20"
            rx="17.5"
            ry="6.5"
            transform="rotate(28 20 20)"
            stroke="url(#ctaGrad)"
            strokeWidth="1"
            fill="none"
            opacity="0.9"
          />
          <circle cx="33.5" cy="15.5" r="2" fill="#a5f3fc" opacity="0.95" />
          <circle cx="33.5" cy="15.5" r="3.5" stroke="#7dd3fc" strokeWidth="0.5" fill="none" opacity="0.35" />
        </g>
        
        <circle cx="20" cy="20" r="8.5" stroke="url(#ctaGrad)" strokeWidth="0.8" fill="none" opacity="0.5" />
        <circle cx="20" cy="20" r="3.5" stroke="url(#ctaGrad)" strokeWidth="0.7" fill="none" opacity="0.75" />
        <circle cx="20" cy="20" r="2.4" fill="url(#ctaGrad)" />
        <circle cx="20" cy="20" r="5" fill="url(#pondGrad)" opacity="0.3" />
      </svg>
    );
  }

  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`logo-mark ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lgGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="48%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      
      <circle cx="20" cy="20" r="17.5" stroke="url(#lgGrad)" strokeWidth="0.7" fill="none" opacity="0.28" />
      <ellipse
        cx="20"
        cy="20"
        rx="17.5"
        ry="6.5"
        transform="rotate(28 20 20)"
        stroke="url(#lgGrad)"
        strokeWidth="1.15"
        fill="none"
        opacity="0.88"
      />
      <circle cx="20" cy="20" r="8.5" stroke="url(#lgGrad)" strokeWidth="0.9" fill="none" opacity="0.55" />
      <circle cx="20" cy="20" r="3.5" stroke="url(#lgGrad)" strokeWidth="0.75" fill="none" opacity="0.8" />
      <circle cx="20" cy="20" r="2.2" fill="url(#lgGrad)" />
      <circle cx="33.5" cy="15.5" r="1.9" fill="#a5f3fc" opacity="0.95" />
      <circle cx="33.5" cy="15.5" r="3.2" stroke="#7dd3fc" strokeWidth="0.5" fill="none" opacity="0.35" />
    </svg>
  );
}
