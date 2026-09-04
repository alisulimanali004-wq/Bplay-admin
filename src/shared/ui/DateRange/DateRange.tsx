import { clsx } from '../clsx';
import { Select } from '../Select/Select';
import { Input } from '../Input/Input';
import styles from './DateRange.module.css';

export type DateRangePreset = 'all' | '7d' | '30d' | '90d' | 'custom';

export interface DateRangeValue {
  preset: DateRangePreset;
  /** ISO date (YYYY-MM-DD) — only meaningful when preset is 'custom'. */
  from: string | null;
  to: string | null;
}

export const EMPTY_DATE_RANGE: DateRangeValue = { preset: 'all', from: null, to: null };

const DAY_MS = 86_400_000;

/**
 * Resolve a DateRangeValue into an absolute [fromMs, toMs] window (either bound
 * may be null = open). Pure — takes `nowMs` so it stays testable and never reads
 * the clock itself. `to` is pushed to the end of its day so the last day is inclusive.
 */
export function resolveDateRange(
  value: DateRangeValue,
  nowMs: number,
): { fromMs: number | null; toMs: number | null } {
  switch (value.preset) {
    case '7d':
      return { fromMs: nowMs - 7 * DAY_MS, toMs: null };
    case '30d':
      return { fromMs: nowMs - 30 * DAY_MS, toMs: null };
    case '90d':
      return { fromMs: nowMs - 90 * DAY_MS, toMs: null };
    case 'custom': {
      const fromMs = value.from ? Date.parse(value.from) : null;
      const parsedTo = value.to ? Date.parse(value.to) : null;
      return { fromMs, toMs: parsedTo === null ? null : parsedTo + DAY_MS - 1 };
    }
    case 'all':
    default:
      return { fromMs: null, toMs: null };
  }
}

/** True only when the range actually constrains results (a fixed window, or a custom range with at least one bound). */
export function isDateRangeActive(value: DateRangeValue): boolean {
  if (value.preset === 'all') return false;
  if (value.preset === 'custom') return Boolean(value.from || value.to);
  return true;
}

export interface DateRangeProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  ariaLabel?: string;
  allLabel: string;
  last7Label: string;
  last30Label: string;
  last90Label: string;
  customLabel: string;
  fromLabel: string;
  toLabel: string;
  className?: string;
  testId?: string;
}

/**
 * A date-window filter: a preset select (All / last 7·30·90 days / Custom) that
 * reveals two inclusive date inputs when Custom is chosen. Emits a serializable
 * DateRangeValue; resolve it to timestamps with resolveDateRange().
 */
export function DateRange({
  value,
  onChange,
  ariaLabel,
  allLabel,
  last7Label,
  last30Label,
  last90Label,
  customLabel,
  fromLabel,
  toLabel,
  className,
  testId,
}: DateRangeProps) {
  const onPreset = (preset: string) => {
    if (preset === 'custom') {
      onChange({ ...value, preset: 'custom' });
    } else {
      onChange({ preset: preset as DateRangePreset, from: null, to: null });
    }
  };

  return (
    <div className={clsx(styles.wrap, className)} data-testid={testId}>
      <Select
        aria-label={ariaLabel}
        value={value.preset}
        onChange={onPreset}
        options={[
          { value: 'all', label: allLabel },
          { value: '7d', label: last7Label },
          { value: '30d', label: last30Label },
          { value: '90d', label: last90Label },
          { value: 'custom', label: customLabel },
        ]}
      />
      {value.preset === 'custom' && (
        <div className={styles.custom}>
          <Input
            type="date"
            aria-label={fromLabel}
            value={value.from ?? ''}
            max={value.to ?? undefined}
            onChange={(event) => onChange({ ...value, from: event.target.value || null })}
            data-testid={testId ? `${testId}-from` : undefined}
          />
          <span className={styles.sep} aria-hidden>
            –
          </span>
          <Input
            type="date"
            aria-label={toLabel}
            value={value.to ?? ''}
            min={value.from ?? undefined}
            onChange={(event) => onChange({ ...value, to: event.target.value || null })}
            data-testid={testId ? `${testId}-to` : undefined}
          />
        </div>
      )}
    </div>
  );
}
