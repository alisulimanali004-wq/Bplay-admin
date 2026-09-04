import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './community.api';
import * as mock from './community.api.mock';

// Types + domain helpers are the feature's public surface for cross-feature reuse
// (the player / owner "Posts" tabs consume getPosts + the Post types from here).
export * from './community.types';
export { communityKeys } from './community.keys';

const impl = USE_MOCKS ? mock : real;

export const getPosts = impl.getPosts;
export const getPostById = impl.getPostById;
export const getPostStats = impl.getPostStats;
export const getPostComments = impl.getPostComments;
export const getPostReactors = impl.getPostReactors;
export const updatePostModeration = impl.updatePostModeration;
export const updateCommentModeration = impl.updateCommentModeration;
