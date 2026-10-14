import './config/loadEnv.js';
import { createApp } from './app.js';
import { assertEnv } from './config/env.js';
import { connectDb } from './config/db.js';
import { ensureUploadDirs } from './utils/files.js';
import { sendBookingReminders } from './services/notificationService.js';
import { releaseStalePaymentHolds } from './services/bookingService.js';

assertEnv();
await connectDb(process.env.MONGODB_URI);
await ensureUploadDirs();

const app = createApp();
const port = Number(process.env.PORT || 5000);
app.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', message: 'server_started', port }));
});

async function maintenance() {
  await releaseStalePaymentHolds();
  if (process.env.ENABLE_REMINDER_JOB !== 'false') await sendBookingReminders();
}

if (process.env.ENABLE_REMINDER_JOB !== 'false') {
  maintenance().catch((error) => {
    console.log(JSON.stringify({ level: 'error', message: 'maintenance_failed', reason: error.message }));
  });
  setInterval(() => {
    maintenance().catch((error) => {
      console.log(JSON.stringify({ level: 'error', message: 'maintenance_failed', reason: error.message }));
    });
  }, 60 * 60 * 1000);
}
