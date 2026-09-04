import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './player.api';
import * as mock from './player.api.mock';

const impl = USE_MOCKS ? mock : real;

export const getPlayers = impl.getPlayers;
export const getPlayerById = impl.getPlayerById;
export const getPlayerStats = impl.getPlayerStats;
export const getPlayerSubscription = impl.getPlayerSubscription;
export const getPlayerRooms = impl.getPlayerRooms;
export const getPlayerRatings = impl.getPlayerRatings;
export const getPlayerReports = impl.getPlayerReports;
export const updatePlayerStatus = impl.updatePlayerStatus;
export const setPlayerRatingHidden = impl.setPlayerRatingHidden;
export const resolvePlayerReport = impl.resolvePlayerReport;
export const liftBookingSuspension = impl.liftBookingSuspension;
export const createPlayer = impl.createPlayer;
