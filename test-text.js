require('dotenv').config();
const { sendText } = require('./text');

sendText('check in and flirt a little').catch(console.error);
