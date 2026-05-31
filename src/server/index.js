import fs from 'node:fs';
import { createApp } from './app.js';

const port = parseInt(process.env.PORT || fs.readFileSync('PORT.txt', 'utf8').trim(), 10);
const app = createApp();

app.listen(port, () => {
  console.log(`Ausschreibungsanalyse listening on ${port}`);
});
