import React from 'react';
import { CalendarDays } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' }
];

/** Shared reporting period control used by every authenticated analytics page. */
const DateRangeSelector = () => {
  const { datePreset, setDatePreset, customRange, setCustomRange } = useDashboard();

  return (
    <section className="date-range-selector" aria-label="Report date range">
      <div className="date-range-label">
        <CalendarDays size={17} />
        <span>Reporting period</span>
      </div>
      <div className="date-range-controls">
        <div className="date-preset-picker" role="group" aria-label="Quick date ranges">
          {DATE_PRESETS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={datePreset === value ? 'date-preset-button active' : 'date-preset-button'}
              onClick={() => setDatePreset(value)}
              aria-pressed={datePreset === value}
            >
              {label}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="custom-date-inputs">
            <label>
              <span className="sr-only">Start date</span>
              <input
                type="date"
                value={customRange.since}
                max={customRange.until || undefined}
                onChange={(event) => setCustomRange((range) => ({ ...range, since: event.target.value }))}
              />
            </label>
            <span>to</span>
            <label>
              <span className="sr-only">End date</span>
              <input
                type="date"
                value={customRange.until}
                min={customRange.since || undefined}
                onChange={(event) => setCustomRange((range) => ({ ...range, until: event.target.value }))}
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
};

export default DateRangeSelector;
