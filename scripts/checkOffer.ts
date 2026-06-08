import dotenv from 'dotenv';
dotenv.config();

import { getOfferByCode } from '../server/db';

(async () => {
  try {
    const code = 'QDNPL9';
    const offer = await getOfferByCode(code);
    console.log('RESULT:', JSON.stringify(offer, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
