const fs = require('fs');
console.log('Starting simple pg test');
try {
  const { Client } = require('pg');
  console.log('PG required');
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_nrG8ZMy1qTSA@ep-steep-sound-ah2s3ppq.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });
  console.log('Client created');
  client.connect().then(() => {
    console.log('Connected');
    client.end().then(() => {
      console.log('Disconnected');
    });
  }).catch(e => {
    console.error('Connection failed:', e);
  });
} catch (e) {
  console.error('Require failed:', e);
}
