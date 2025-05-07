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
  },
  pingTimeout: 10000,    // 핑 타임아웃 (ms)
  pingInterval: 5000     // 핑 간격 (ms)
});

// 미들웨어 설정
app.use(cors());
app.use(express.static(path.join(__dirname, '../client')));

// 게임 매니저 초기화
const gameManager = new GameManager(io);

// 활성 소켓 연결 관리
const activeConnections = new Map();

// 소켓 연결 처리
io.on('connection', (socket) => {
  console.log(`새로운 사용자 연결: ${socket.id}`);
  activeConnections.set(socket.id, { 
    connected: true, 
    timestamp: Date.now(),
    nickname: null,
    inGame: false
  });
  
  // 게임 상태 동기화 요청 처리 (재연결 시)
  socket.on('sync_game_state', () => {
    console.log(`사용자 ${socket.id}가 게임 상태 동기화를 요청했습니다.`);
    
    const player = gameManager.getPlayerById(socket.id);
    if (player) {
      console.log(`기존 플레이어 정보 발견: ${player.nickname}`);
      
      // 플레이어 정보 재전송
      socket.emit('player_info', {
        id: socket.id,
        nickname: player.nickname,
        isHost: player.isHost
      });
      
      // 게임 진행 중이면 현재 게임 상태 전송
      if (gameManager.gameStarted) {
        socket.emit('game_update', {
          turnOrder: gameManager.getTurnOrderInfo(),
          currentTurn: gameManager.currentTurn,
          messages: gameManager.messages,
          category: gameManager.category,
          votingStarted: gameManager.votingStarted,
          votes: gameManager.votingStarted ? Array.from(gameManager.votes.entries()) : null
        });
      } else {
        // 로비 상태면 로비 정보 전송
        socket.emit('lobby_update', gameManager.getLobbyPlayers());
      }
    } else {
      console.log(`플레이어 정보를 찾을 수 없음: ${socket.id}`);
      // 새 소켓으로 간주하고 다시 로그인하도록 안내
      socket.emit('force_login', { message: "다시 로그인해주세요." });
    }
  });
  
  // 닉네임 설정 및 로비 입장
  socket.on('join_lobby', (nickname) => {
    console.log(`사용자 ${socket.id}가 닉네임 '${nickname}'으로 로비에 입장합니다.`);
    
    // 기존 플레이어인지 확인
    const existingPlayer = gameManager.getPlayerById(socket.id);
    let player;
    
    if (existingPlayer) {
      console.log(`기존 플레이어가 재연결했습니다: ${nickname}`);
      player = existingPlayer;
      // 닉네임 업데이트 (필요한 경우)
      if (player.nickname !== nickname) {
        player.nickname = nickname;
      }
    } else {
      // 새 플레이어 추가
      player = gameManager.addPlayer(socket.id, nickname);
      console.log(`새 플레이어가 추가되었습니다: ${nickname} (방장: ${player.isHost})`);
    }
    
    // 활성 연결 정보 업데이트
    activeConnections.set(socket.id, { 
      connected: true, 
      timestamp: Date.now(),
      nickname: nickname,
      inGame: gameManager.gameStarted
    });
    
    // 방장 여부 정보 전송
    socket.emit('player_info', {
      id: socket.id,
      nickname: player.nickname,
      isHost: player.isHost
    });
    
    // 전체 로비 업데이트
    io.emit('lobby_update', gameManager.getLobbyPlayers());
  });
  
  // 게임 모드 변경
  socket.on('mode_changed', (data) => {
    console.log(`플레이어 ${socket.id}가 게임 모드를 변경했습니다:`, data);
    
    // 방장 확인
    if (gameManager.isPlayerHost(socket.id)) {
      console.log('방장이 게임 모드를 변경했습니다:', data.mode);
      
      // 모든 클라이언트에 모드 변경 전파
      io.emit('mode_update', data);
    } else {
      console.warn('방장이 아닌 플레이어가 게임 모드를 변경하려고 시도했습니다:', socket.id);
      
      // 현재 모드를 요청자에게만 다시 전송 (동기화 목적)
      socket.emit('mode_update', { mode: 'basic' }); // 기본값으로 재설정
    }
  });
  
  // 게임 시작
  socket.on('start_game', (gameMode) => {
    console.log(`플레이어 ${socket.id}가 '${gameMode}' 모드로 게임 시작을 요청했습니다.`);
    
    // 방장 확인
    if (!gameManager.isPlayerHost(socket.id)) {
      socket.emit('game_error', '방장만 게임을 시작할 수 있습니다.');
      return;
    }
    
    const result = gameManager.startGame(gameMode, socket.id);
    
    // 게임 시작 결과 처리
    if (result.success) {
      console.log(`게임이 성공적으로 시작되었습니다. 모드: ${gameMode}`);
      
      // 활성 연결 정보 업데이트
      activeConnections.forEach((conn, socketId) => {
        const player = gameManager.getPlayerById(socketId);
        if (player && !player.isSpectator) {
          conn.inGame = true;
        }
      });
    } else {
      // 게임 시작 실패 시 오류 메시지 전송
      console.error(`게임 시작 실패: ${result.message}`);
      socket.emit('game_error', result.message);
    }
  });
  
  // 게임 중 채팅 메시지
  socket.on('game_chat', (message) => {
    console.log(`게임 채팅 메시지 (${socket.id}): ${message}`);
    gameManager.handleGameChat(socket.id, message);
  });
  
  // 자유 채팅 메시지
  socket.on('chat_message', (message) => {
    const player = gameManager.getPlayerById(socket.id);
    if (player) {
      console.log(`자유 채팅 메시지 (${player.nickname}): ${message}`);
      io.emit('chat_message', {
        nickname: player.nickname,
        message: message
      });
    }
  });
  
  // 투표 제출
  socket.on('vote_submit', (votedId) => {
    console.log(`플레이어 ${socket.id}가 ${votedId}에게 투표했습니다.`);
    gameManager.submitVote(socket.id, votedId);
  });
  
  // 라이어 추측
  socket.on('liar_guess', (word) => {
    console.log(`라이어 ${socket.id}가 단어를 추측했습니다: ${word}`);
    gameManager.checkLiarGuess(socket.id, word);
  });
  
  // 제시어 확인 처리
  socket.on('info_confirmed', (data) => {
    const player = gameManager.getPlayerById(socket.id);
    if (!player) return;
    
    console.log(`플레이어 ${player.nickname}가 제시어 정보를 확인했습니다.`);
    
    // 전체 플레이어 수와 확인한 플레이어 수 계산
    let totalPlayers = 0;
    let confirmedPlayers = 0;
    
    gameManager.players.forEach(p => {
      if (!p.isSpectator) {
        totalPlayers++;
        if (p.infoConfirmed) {
          confirmedPlayers++;
        }
      }
    });
    
    // 현재 플레이어 확인 상태 업데이트
    player.infoConfirmed = data.confirmed;
    
    if (data.confirmed) {
      confirmedPlayers++;
    }
    
    // 개별 플레이어 확인 알림
    io.emit('player_confirmed', {
      playerId: socket.id,
      allConfirmed: confirmedPlayers >= totalPlayers
    });
    
    // 모든 플레이어가 확인했으면 자동으로 게임 시작
    if (confirmedPlayers >= totalPlayers) {
      console.log('모든 플레이어가 제시어를 확인했습니다. 게임을 시작합니다.');
      setTimeout(() => {
        gameManager.updateGameState();
      }, 1000); // 1초 후 게임 업데이트
    }
  });
  
  // 게임 재시작
  socket.on('restart_game', (gameMode) => {
    console.log(`플레이어 ${socket.id}가 '${gameMode}' 모드로 게임 재시작을 요청했습니다.`);
    const result = gameManager.restartGame(socket.id, gameMode);
    
    // 게임 재시작 성공 시 활성 연결 정보 업데이트
    if (result.success) {
      activeConnections.forEach((conn, socketId) => {
        const player = gameManager.getPlayerById(socketId);
        if (player && !player.isSpectator) {
          conn.inGame = true;
        }
      });
    } else {
      // 게임 재시작 실패 시 오류 메시지 전송
      socket.emit('game_error', result.message);
    }
  });
  
  // 하트비트 (연결 상태 확인)
  socket.on('heartbeat', () => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.timestamp = Date.now();
      socket.emit('heartbeat_ack');
    }
  });
  
  // 연결 해제
  socket.on('disconnect', () => {
    console.log(`사용자 연결 해제: ${socket.id}`);
    
    // 활성 연결 정보 업데이트
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.connected = false;
      connection.disconnectedAt = Date.now();
      
      // 일정 시간(예: 30초) 후에도 재연결되지 않으면 플레이어 제거
      setTimeout(() => {
        const conn = activeConnections.get(socket.id);
        if (conn && !conn.connected) {
          console.log(`플레이어 ${socket.id} 제거 (재연결 시간 초과)`);
          gameManager.removePlayer(socket.id);
          activeConnections.delete(socket.id);
          io.emit('lobby_update', gameManager.getLobbyPlayers());
        }
      }, 30000); // 30초
    } else {
      // 즉시 플레이어 제거
      gameManager.removePlayer(socket.id);
    }
    
    io.emit('lobby_update', gameManager.getLobbyPlayers());
  });
});

// 주기적인 비활성 연결 정리 (5분마다)
setInterval(() => {
  const now = Date.now();
  const inactiveThreshold = 5 * 60 * 1000; // 5분
  
  activeConnections.forEach((connection, socketId) => {
    if (!connection.connected && (now - connection.disconnectedAt > inactiveThreshold)) {
      console.log(`비활성 연결 제거: ${socketId}`);
      gameManager.removePlayer(socketId);
      activeConnections.delete(socketId);
    }
  });
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});