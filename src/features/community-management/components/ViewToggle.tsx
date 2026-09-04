import { useTranslation } from 'react-i18next';
import { ViewToggle as KitViewToggle, type ViewMode } from '@ui';

export type { ViewMode };

interface Props {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

/** Grid ⇄ table switch for the community list page — the kit toggle, localized. */
export function ViewToggle({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <KitViewToggle
      value={value}
      onChange={onChange}
      groupLabel={t('community.view.label')}
      gridLabel={t('community.view.grid')}
      tableLabel={t('community.view.table')}
      testIdPrefix="community"
    />
  );
}
