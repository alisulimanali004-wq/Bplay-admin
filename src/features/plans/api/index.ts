import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './plan.api';
import * as mock from './plan.api.mock';

// One flag flips the whole feature — the mock and the real source share the exact
// same signatures (and the same filter pipeline), so nothing downstream changes.
const impl = USE_MOCKS ? mock : real;

export const getPlans = impl.getPlans;
export const getPlanStats = impl.getPlanStats;
export const getPlanById = impl.getPlanById;
export const createPlan = impl.createPlan;
export const updatePlan = impl.updatePlan;
export const setPlanActive = impl.setPlanActive;
export const movePlan = impl.movePlan;
export const deletePlan = impl.deletePlan;
