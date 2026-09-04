import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './audit.api';
import * as mock from './audit.api.mock';

const impl = USE_MOCKS ? mock : real;

export const getAuditLog = impl.getAuditLog;
export const getAuditForExport = impl.getAuditForExport;

// There is deliberately NO write export here. The trail is append-only
// (FR-ADM-AUDIT-008 / AUD7) and the dashboard must never offer an edit or a
// delete for it.
