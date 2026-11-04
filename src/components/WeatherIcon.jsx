const CLOUD = 'M8.4 22.2h15.2a5 5 0 0 0 .5-10 7.1 7.1 0 0 0-13.4-1.6 5.9 5.9 0 0 0-2.3 11.6Z';

function CloudShape({ raised = false }) {
  return <path d={CLOUD} transform={raised ? 'translate(0 -4)' : undefined} />;
}

function PartialSun() {
  return <g>
    <path d="M18.1 8.6a4.4 4.4 0 1 1 8.1 3M22.3 1.5v2M28 4.6l1.5-1.5M29.5 9.6H31M28.5 14l1.3 1.3M16.4 4.3l-1.2-1.2" />
  </g>;
}

/** A single rounded outline system, drawn at 32 px to stay legible at forecast sizes. */
export function WeatherIcon({ kind = 'clear', size = 24, className = '', ...props }) {
  let drawing;
  switch (kind) {
    case 'clear':
      drawing = <><circle cx="16" cy="16" r="5.6" /><path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.8 6.8l2.1 2.1M23.1 23.1l2.1 2.1M6.8 25.2l2.1-2.1M23.1 8.9l2.1-2.1" /></>;
      break;
    case 'clouds':
      drawing = <><PartialSun /><CloudShape /></>;
      break;
    case 'night-clouds':
      drawing = <><path d="M23 3.5a6.7 6.7 0 0 0 6.7 8.5A7.1 7.1 0 0 1 24 15" /><CloudShape /></>;
      break;
    case 'rain':
      drawing = <><CloudShape raised /><path d="m10.5 21.5-1.8 4.7m7.8-4.7-2.9 7.3m8.9-7.3-1.8 4.7" /></>;
      break;
    case 'snow':
      drawing = <><CloudShape raised /><g fill="currentColor" stroke="none"><circle cx="10" cy="23" r="1" /><circle cx="20.5" cy="22.5" r="1" /><circle cx="15.4" cy="26.5" r="1" /><circle cx="23" cy="28" r="1" /><circle cx="7.8" cy="28.6" r="1" /></g></>;
      break;
    case 'storm':
      drawing = <><path d="M8.4 18.2a5.9 5.9 0 0 1 2.3-11.6 7.1 7.1 0 0 1 13.4 1.6 5 5 0 0 1-.5 10H23" /><path d="m17.3 14.7-6.1 8h5l-2.1 6.5 8.1-10.3h-5l2.5-4.2" /></>;
      break;
    case 'fog':
      drawing = <><CloudShape raised /><path d="M4 22h20M2 26h17m-11 4h20" /></>;
      break;
    case 'night':
      drawing = <path d="M26.4 20.2A10.6 10.6 0 0 1 11.8 5.6a11.1 11.1 0 1 0 14.6 14.6Z" />;
      break;
    default:
      drawing = <><path d="M16 6.3a6 6 0 0 1 10.6 3.1 4.5 4.5 0 0 1 .8 8.6" /><CloudShape /></>;
  }
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.05" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>{drawing}</svg>;
}
