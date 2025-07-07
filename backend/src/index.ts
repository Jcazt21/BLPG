import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import gameRoutes from './routes/gameRoutes';
// import { createServer } from 'http';
// import { Server as SocketIOServer } from 'socket.io';

const app = express();
const PORT = process.env.PORT || 5185;
const HOST = process.env.HOST || 'localhost';

app.use(cors());
app.use(express.json());
app.use('/game', gameRoutes);

// Preparado para WebSocket (Socket.IO), pero no activado aún
// const httpServer = createServer(app);
// const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
// io.on('connection', (socket) => {
//   console.log('Nuevo cliente conectado:', socket.id);
//   // Aquí irá la lógica de multiplayer
// });

app.listen(Number(PORT), HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
// Para activar WebSocket en el futuro, cambia app.listen por httpServer.listen 