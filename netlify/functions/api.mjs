import { handleApi } from '../../lib/api-handler.mjs';
import { NetlifyStore } from '../../lib/netlify-store.mjs';

const store = new NetlifyStore();

export default async request => handleApi(request, store);

export const config = {
  path: '/api/*',
};
