import dotenv from 'dotenv';
import app from './app.js';
import { testDbConnection, initDatabase } from './db.js';

dotenv.config();

const PORT = process.env.BACKEND_PORT || 5000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[Women Safety Backend] Express server running on port ${PORT}`);
  console.log(`[Women Safety Backend] Health check: http://localhost:${PORT}/api/health`);

  // Attempt database verification
  try {
    const dbStatus = await testDbConnection();
    if (dbStatus.connected) {
      await initDatabase();
    } else {
      console.warn(`[MySQL Notice] Initial connection check: ${dbStatus.error}. Database will connect once MySQL server is reachable.`);
    }
  } catch (err) {
    console.warn('[MySQL Notice] Database initialization deferred:', err.message);
  }
});

export default app;
