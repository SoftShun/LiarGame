const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const socketIo = require('socket.io');
const GameManager = require('./game/game');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 미들웨어 설정
app.use(cors());
app.use(express.static(path.join(__dirname, '../client')));

// 게임 매니저 초기화
const gameManager = new GameManager(io);

// 소켓 연결 처리
io.on('connection', (socket) => {
  console.log(`새로운 사용자 연결: ${socket.id}`);
  
  // 닉네임 설정 및 로비 입장
  socket.on('join_lobby', (nickname) => {
    const player = gameManager.addPlayer(socket.id, nickname);
    
    // 방장 여부 정보 전송
    socket.emit('player_info', {
      id: socket.id,
      nickname: player.nickname,
      isHost: player.isHost
    });
    
    // 전체 로비 업데이트
    io.emit('lobby_update', gameManager.getLobbyPlayers());
  });
  
  // 게임 시작
  socket.on('start_game', (gameMode) => {
    const result = gameManager.startGame(gameMode, socket.id);
    
    // 게임 시작 실패 시 오류 메시지 전송
    if (!result.success) {
      socket.emit('game_error', result.message);
    }
  });
  
  // 게임 중 채팅 메시지
  socket.on('game_chat', (message) => {
    gameManager.handleGameChat(socket.id, message);
  });
  
  // 자유 채팅 메시지
  socket.on('chat_message', (message) => {
    const player = gameManager.getPlayerById(socket.id);
    if (player) {
      io.emit('chat_message', {
        nickname: player.nickname,
        message: message
      });
    }
  });
  
  // 투표 제출
  socket.on('vote_submit', (votedId) => {
    gameManager.submitVote(socket.id, votedId);
  });
  
  // 라이어 추측
  socket.on('liar_guess', (word) => {
    gameManager.checkLiarGuess(socket.id, word);
  });
  
  // 게임 재시작
  socket.on('restart_game', (gameMode) => {
    const result = gameManager.restartGame(socket.id, gameMode);
    
    // 게임 재시작 실패 시 오류 메시지 전송
    if (!result.success) {
      socket.emit('game_error', result.message);
    }
  });
  
  // 연결 해제
  socket.on('disconnect', () => {
    console.log(`사용자 연결 해제: ${socket.id}`);
    gameManager.removePlayer(socket.id);
    io.emit('lobby_update', gameManager.getLobbyPlayers());
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});