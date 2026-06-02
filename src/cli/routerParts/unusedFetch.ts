import { type FetchLike } from '../../core/entities/model/modelTransport';

export const unusedFetch: FetchLike = async () => {
  throw new Error('Unexpected network request while listing static model options.');
};
