import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './owner.api';
import * as mock from './owner.api.mock';
import * as subReal from './subscription.api';
import * as subMock from './subscription.api.mock';

const impl = USE_MOCKS ? mock : real;
const subImpl = USE_MOCKS ? subMock : subReal;

export const getOwners = impl.getOwners;
export const getOwnerById = impl.getOwnerById;
export const getOwnerStats = impl.getOwnerStats;
export const updateOwnerStatus = impl.updateOwnerStatus;
export const reviewOwnerDocument = impl.reviewOwnerDocument;
export const uploadOwnerDocument = impl.uploadOwnerDocument;
export const createOwner = impl.createOwner;
export const updateOwner = impl.updateOwner;

export const getPlatformPlans = subImpl.getPlatformPlans;
export const getOwnerSubscription = subImpl.getOwnerSubscription;
export const getOwnerInvoices = subImpl.getOwnerInvoices;
export const changeOwnerSubscription = subImpl.changeOwnerSubscription;
