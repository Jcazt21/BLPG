import express from 'express';
import cors from 'cors';
import gameRoutes from './routes/gameRoutes';

const app = express();
const PORT = process.env.PORT || 5185;

app.use(cors());
app.use(express.json());
app.use('/game', gameRoutes);

app.listen(Number(PORT), '172.16.50.34', () => {
  console.log(`Server running on http://172.16.50.34:${PORT}`);
}); 