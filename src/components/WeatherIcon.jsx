import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Sun } from 'lucide-react';

const ICONS = { clear: Sun, clouds: CloudSun, rain: CloudRain, snow: CloudSnow, storm: CloudLightning, fog: CloudFog, night: Moon };

export function WeatherIcon({ kind = 'clear', size = 24, className = '', ...props }) {
  const Icon = ICONS[kind] || Cloud;
  return <Icon size={size} strokeWidth={1.5} className={className} aria-hidden="true" {...props} />;
}
