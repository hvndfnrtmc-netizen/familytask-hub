const express = require('express');
const cors = require('cors');

const authRouter    = require('./routes/auth');
const membersRouter = require('./routes/members');
const tasksRouter   = require('./routes/tasks');
const rewardsRouter = require('./routes/rewards');
const eventsRouter  = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth',    authRouter);
app.use('/api/members', membersRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/events', eventsRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`FamilyTask Hub 后端运行在 http://localhost:${PORT}`);
});
