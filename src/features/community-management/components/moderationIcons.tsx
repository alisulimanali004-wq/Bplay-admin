import type { ReactNode } from 'react';
import { EyeOffIcon, RotateCcwIcon, TrashIcon } from '@ui';
import type { ModerationAction } from '../api/community.types';

/** The icon for each moderation action — shared by post + comment action UIs. */
export const MODERATION_ICON: Record<ModerationAction, ReactNode> = {
  remove: <EyeOffIcon />,
  restore: <RotateCcwIcon />,
  delete: <TrashIcon />,
};
