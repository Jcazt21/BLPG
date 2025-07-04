import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import gameRoutes from './routes/gameRoutes';

const app = express();
const PORT = process.env.PORT || 5185;
const HOST = process.env.HOST || '172.16.50.34';

app.use(cors());
app.use(express.json());
app.use('/game', gameRoutes);

app.listen(Number(PORT), HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
}); 