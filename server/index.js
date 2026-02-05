const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/moneyreport';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).catch((err) => {
  console.warn('MongoDB 연결 실패:', err.message);
  console.warn('MongoDB가 실행 중이 아니거나 연결 정보가 잘못되었습니다.');
  console.warn('MongoDB를 설치하거나 MongoDB Atlas를 사용하세요.');
});

const db = mongoose.connection;
db.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
  console.warn('일부 기능이 제한될 수 있습니다.');
});
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budget', require('./routes/budget'));
app.use('/api/kb', require('./routes/kb'));
app.use('/api/shorts', require('./routes/shorts'));
app.use('/api/n8n', require('./routes/n8n'));
app.use('/api/push', require('./routes/push'));
app.use('/api/ai', require('./routes/ai'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const { startPushScheduler } = require('./services/pushScheduler');
if (process.env.ENABLE_LOCAL_SCHEDULER !== 'false') {
  startPushScheduler();
}
