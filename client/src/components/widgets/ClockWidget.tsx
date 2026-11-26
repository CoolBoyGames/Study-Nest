import { useEffect, useState } from 'react';
import { Calendar, Clock as ClockIcon } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Button } from '../ui';

export function ClockWidget() {
  const clock = useSettingsStore((s) => s.clock);
  const updateClock = useSettingsStore((s) => s.updateClock);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const hours24 = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const formattedTime = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: clock.hourFormat === '12h',
  });

  const formattedDate = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = (hours24 % 12) * 30 + minutes * 0.5;

  return (
    <div className="flex flex-col items-center gap-3">
      {clock.mode === 'digital' ? (
        <div className="py-1 text-center">
          <div
            style={{ fontSize: 'clamp(1.375rem, 13cqi, 4rem)' }}
            className="tabular-nums font-heading font-semibold leading-none tracking-tight text-[var(--text)]"
          >
            {formattedTime}
          </div>
          {clock.showDate && (
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">{formattedDate}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-1">
          <svg
            viewBox="0 0 120 120"
            style={{
              width: 'clamp(5.25rem, 48cqi, 14rem)',
              height: 'clamp(5.25rem, 48cqi, 14rem)',
            }}
            role="img"
            aria-label={`Analog clock showing ${formattedTime}`}
          >
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="var(--surface)"
              stroke="var(--border-control)"
              strokeWidth="2"
            />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <line
                key={deg}
                x1="60"
                y1="11"
                x2="60"
                y2={deg % 90 === 0 ? '18' : '15'}
                stroke="var(--text-muted)"
                strokeWidth={deg % 90 === 0 ? '2' : '1.2'}
                strokeLinecap="round"
                transform={`rotate(${deg} 60 60)`}
              />
            ))}
            {/* Hour hand */}
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="32"
              stroke="var(--text)"
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${hourAngle} 60 60)`}
            />
            {/* Minute hand */}
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="22"
              stroke="var(--text)"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${minuteAngle} 60 60)`}
            />
            {/* Second hand */}
            <line
              x1="60"
              y1="66"
              x2="60"
              y2="18"
              stroke="var(--primary)"
              strokeWidth="1.4"
              strokeLinecap="round"
              transform={`rotate(${secondAngle} 60 60)`}
            />
            <circle cx="60" cy="60" r="3" fill="var(--primary)" />
          </svg>
          {clock.showDate && (
            <p className="text-sm text-[var(--text-muted)]">{formattedDate}</p>
          )}
        </div>
      )}

      <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            updateClock({ mode: clock.mode === 'digital' ? 'analog' : 'digital' })
          }
        >
          <ClockIcon size={14} strokeWidth={1.5} />
          {clock.mode === 'digital' ? 'Analog' : 'Digital'}
        </Button>

        {clock.mode === 'digital' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateClock({ hourFormat: clock.hourFormat === '24h' ? '12h' : '24h' })
            }
          >
            {clock.hourFormat === '24h' ? '12h' : '24h'}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          aria-pressed={clock.showDate}
          onClick={() => updateClock({ showDate: !clock.showDate })}
        >
          <Calendar size={14} strokeWidth={1.5} />
          Date
        </Button>
      </div>
    </div>
  );
}
