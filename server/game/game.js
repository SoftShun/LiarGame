const Player = require('./player');
const categories = require('../data/categories');

class GameManager {
  constructor(io) {
    this.io = io;
    this.players = new Map(); // 플레이어 ID와 Player 객체 맵핑
    this.inLobby = true; // 현재 로비 상태인지
    this.gameStarted = false; // 게임이 시작되었는지
    this.spyMode = false; // 스파이 모드 활성화 여부
    this.category = null; // 현재 카테고리
    this.word = null; // 현재 단어
    this.liar = null; // 라이어 플레이어 ID
    this.spy = null; // 스파이 플레이어 ID
    this.turnOrder = []; // 발언 순서
    this.currentTurn = 0; // 현재 차례
    this.messages = []; // 게임 중 메시지 기록
    this.votingStarted = false; // 투표 시작 여부
    this.votes = new Map(); // 투표 결과 (투표자 ID => 대상 ID)
    this.gameResult = null; // 게임 결과
  }

  // 플레이어 추가
  addPlayer(id, nickname) {
    if (nickname.length > 6) {
      nickname = nickname.substring(0, 6);
    }
    
    const player = new Player(id, nickname);
    this.players.set(id, player);
    
    // 게임이 이미 시작되었으면 관전자로 설정
    if (this.gameStarted) {
      player.isSpectator = true;
    }
    
    return player;
  }
  
  // 플레이어 제거
  removePlayer(id) {
    this.players.delete(id);
    
    // 게임 중이고 플레이어가 게임에 참여 중이었다면 게임 상태 업데이트
    if (this.gameStarted && this.turnOrder.includes(id)) {
      // 라이어가 나갔을 경우
      if (id === this.liar) {
        this.endGame('players', '라이어가 게임을 나갔습니다.');
      }
      // 스파이가 나갔을 경우
      else if (this.spyMode && id === this.spy) {
        this.endGame('players', '스파이가 게임을 나갔습니다.');
      }
      // 일반 플레이어가 나갔을 경우, 턴 순서 업데이트
      else {
        const index = this.turnOrder.indexOf(id);
        this.turnOrder.splice(index, 1);
        
        // 현재 차례가 나간 플레이어였다면 다음 차례로 넘어감
        if (this.currentTurn >= this.turnOrder.length) {
          this.currentTurn = 0;
        }
        
        // 플레이어가 2명 이하면 게임 종료
        if (this.turnOrder.length <= 2) {
          this.endGame('players', '플레이어가 부족하여 게임을 종료합니다.');
        } else {
          this.updateGameState();
        }
      }
    }
  }
  
  // 로비 플레이어 목록 반환
  getLobbyPlayers() {
    const players = [];
    this.players.forEach(player => {
      players.push({
        id: player.id,
        nickname: player.nickname,
        isSpectator: player.isSpectator
      });
    });
    return players;
  }
  
  // ID로 플레이어 찾기
  getPlayerById(id) {
    return this.players.get(id);
  }
  
  // 게임 시작
  startGame(gameMode) {
    if (this.players.size < 3) {
      return {success: false, message: '최소 3명의 플레이어가 필요합니다.'};
    }
    
    if (this.players.size > 8) {
      return {success: false, message: '최대 8명의 플레이어만 참여할 수 있습니다.'};
    }
    
    this.inLobby = false;
    this.gameStarted = true;
    this.spyMode = gameMode === 'spy';
    this.turnOrder = [];
    this.currentTurn = 0;
    this.messages = [];
    this.votingStarted = false;
    this.votes = new Map();
    this.gameResult = null;
    
    // 참가자 목록 설정 (관전자 제외)
    this.players.forEach(player => {
      if (!player.isSpectator) {
        this.turnOrder.push(player.id);
        player.score = player.score || 0; // 점수 초기화
        player.isLiar = false;
        player.isSpy = false;
      }
    });
    
    // 턴 순서 랜덤 섞기
    this.shuffleArray(this.turnOrder);
    
    // 라이어 선택
    const liarIndex = Math.floor(Math.random() * this.turnOrder.length);
    this.liar = this.turnOrder[liarIndex];
    this.players.get(this.liar).isLiar = true;
    
    // 스파이 모드인 경우 스파이 선택 (라이어 외에서)
    if (this.spyMode && this.turnOrder.length > 3) {
      let spyIndex;
      do {
        spyIndex = Math.floor(Math.random() * this.turnOrder.length);
      } while (spyIndex === liarIndex);
      
      this.spy = this.turnOrder[spyIndex];
      this.players.get(this.spy).isSpy = true;
    }
    
    // 카테고리 및 단어 선택
    this.selectCategoryAndWord();
    
    // 게임 시작 이벤트 발송
    this.sendGameStartInfo();
    
    return {success: true};
  }
  
  // 카테고리 및 단어 선택
  selectCategoryAndWord() {
    // 랜덤 카테고리 선택
    const categoryIndex = Math.floor(Math.random() * categories.length);
    this.category = categories[categoryIndex].name;
    
    // 난이도별 단어 선택
    const difficultyRandom = Math.random();
    let wordPool;
    
    if (difficultyRandom < 0.25) {
      // 쉬운 단어 (25%)
      wordPool = categories[categoryIndex].words.easy;
    } else if (difficultyRandom < 0.75) {
      // 보통 단어 (50%)
      wordPool = categories[categoryIndex].words.medium;
    } else {
      // 어려운 단어 (25%)
      wordPool = categories[categoryIndex].words.hard;
    }
    
    // 랜덤 단어 선택
    const wordIndex = Math.floor(Math.random() * wordPool.length);
    this.word = wordPool[wordIndex];
  }
  
  // 게임 시작 정보 전송
  sendGameStartInfo() {
    this.players.forEach(player => {
      let roleInfo;
      
      if (player.isLiar) {
        roleInfo = {
          role: 'liar',
          category: this.category,
          word: null
        };
      } else if (player.isSpy) {
        roleInfo = {
          role: 'spy',
          category: this.category,
          word: this.word
        };
      } else {
        roleInfo = {
          role: 'player',
          category: this.category,
          word: this.word
        };
      }
      
      this.io.to(player.id).emit('game_start', {
        roleInfo,
        turnOrder: this.getTurnOrderInfo(),
        spyMode: this.spyMode
      });
    });
    
    // 4초 후 자동으로 게임 화면으로 이동
    setTimeout(() => {
      this.updateGameState();
    }, 4000);
  }
  
  // 턴 순서 정보 반환
  getTurnOrderInfo() {
    return this.turnOrder.map(id => {
      const player = this.players.get(id);
      return {
        id: player.id,
        nickname: player.nickname,
        isTurn: this.turnOrder[this.currentTurn] === id
      };
    });
  }
  
  // 게임 상태 업데이트
  updateGameState() {
    if (!this.gameStarted) return;
    
    // 모든 플레이어가 발언한 경우 투표 시작
    if (this.messages.length >= this.turnOrder.length && !this.votingStarted) {
      this.startVoting();
      return;
    }
    
    this.io.emit('game_update', {
      turnOrder: this.getTurnOrderInfo(),
      currentTurn: this.currentTurn,
      messages: this.messages,
      category: this.category,
      votingStarted: this.votingStarted,
      votes: this.votingStarted ? Array.from(this.votes.entries()) : null
    });
  }
  
  // 게임 채팅 처리
  handleGameChat(playerId, message) {
    if (!this.gameStarted) return;
    
    const player = this.players.get(playerId);
    if (!player || player.isSpectator) return;
    
    // 현재 발언 차례인지 확인
    if (this.turnOrder[this.currentTurn] !== playerId) {
      return;
    }
    
    // 메시지 길이 제한 (40자)
    if (message.length > 40) {
      message = message.substring(0, 40);
    }
    
    // 메시지 기록 및 다음 차례로 넘기기
    this.messages.push({
      playerId,
      nickname: player.nickname,
      message
    });
    
    this.currentTurn = (this.currentTurn + 1) % this.turnOrder.length;
    this.updateGameState();
  }
  
  // 투표 시작
  startVoting() {
    this.votingStarted = true;
    this.votes.clear();
    
    this.io.emit('vote_start', {
      turnOrder: this.getTurnOrderInfo()
    });
    
    // 20초 후 투표 종료
    setTimeout(() => {
      this.endVoting();
    }, 20000);
  }
  
  // 투표 제출
  submitVote(voterId, votedId) {
    if (!this.votingStarted) return;
    
    const voter = this.players.get(voterId);
    if (!voter || voter.isSpectator) return;
    
    this.votes.set(voterId, votedId);
    
    // 모든 플레이어가 투표했는지 확인
    let allVoted = true;
    this.turnOrder.forEach(id => {
      if (!this.votes.has(id)) {
        allVoted = false;
      }
    });
    
    // 모든 플레이어가 투표했으면 투표 종료
    if (allVoted) {
      this.endVoting();
    } else {
      // 투표 현황 업데이트
      this.io.emit('vote_update', Array.from(this.votes.entries()));
    }
  }
  
  // 투표 종료
  endVoting() {
    if (!this.votingStarted) return;
    
    // 투표 결과 집계
    const voteCount = new Map();
    this.turnOrder.forEach(id => {
      voteCount.set(id, 0);
    });
    
    this.votes.forEach(votedId => {
      if (voteCount.has(votedId)) {
        voteCount.set(votedId, voteCount.get(votedId) + 1);
      }
    });
    
    // 최다 득표자 찾기
    let maxVotes = 0;
    let mostVotedId = null;
    let isTie = false;
    
    voteCount.forEach((count, id) => {
      if (count > maxVotes) {
        maxVotes = count;
        mostVotedId = id;
        isTie = false;
      } else if (count === maxVotes && count > 0) {
        isTie = true;
      }
    });
    
    // 과반수 계산
    const majority = Math.ceil(this.turnOrder.length / 2);
    
    // 투표 결과 처리
    if (isTie || maxVotes < majority) {
      // 동점이거나 과반수를 얻지 못한 경우 라이어 승리
      this.endGame('liar', '라이어가 투표에서 탈출했습니다!');
    } else {
      // 최다 득표자가 라이어인 경우
      if (mostVotedId === this.liar) {
        // 라이어에게 단어 추측 기회 부여
        this.io.emit('liar_caught', {
          liarId: this.liar,
          nickname: this.players.get(this.liar).nickname
        });
        
        // 20초 후 라이어가 추측하지 않으면 자동으로 게임 종료
        setTimeout(() => {
          if (this.gameStarted) {
            this.endGame('players', '라이어가 시간 내에 단어를 맞추지 못했습니다.');
          }
        }, 20000);
      } 
      // 최다 득표자가 스파이인 경우 (스파이 모드)
      else if (this.spyMode && mostVotedId === this.spy) {
        this.endGame('players', '스파이가 발각되었습니다!');
      }
      // 최다 득표자가 일반 플레이어인 경우
      else {
        this.endGame('liar', '라이어가 성공적으로 위장했습니다!');
      }
    }
  }
  
  // 라이어 단어 추측 확인
  checkLiarGuess(liardId, guessWord) {
    if (!this.gameStarted || liardId !== this.liar) return;
    
    // 라이어가 단어를 맞췄는지 확인
    if (guessWord.toLowerCase() === this.word.toLowerCase()) {
      this.endGame('liar', '라이어가 단어를 맞췄습니다!');
    } else {
      this.endGame('players', '라이어가 단어를 맞추지 못했습니다.');
    }
  }
  
  // 게임 종료
  endGame(winner, message) {
    if (!this.gameStarted) return;
    
    // 점수 업데이트
    if (winner === 'liar') {
      // 라이어 승리
      this.players.get(this.liar).score += 3;
      if (this.spyMode && this.spy) {
        this.players.get(this.spy).score += 1;
      }
    } else {
      // 일반 플레이어 승리
      this.turnOrder.forEach(id => {
        const player = this.players.get(id);
        if (!player.isLiar && !player.isSpy) {
          player.score += 1;
        }
      });
    }
    
    // 게임 결과 저장
    this.gameResult = {
      winner,
      message,
      liar: {
        id: this.liar,
        nickname: this.players.get(this.liar).nickname
      },
      spy: this.spyMode && this.spy ? {
        id: this.spy,
        nickname: this.players.get(this.spy).nickname
      } : null,
      category: this.category,
      word: this.word,
      scores: this.getPlayerScores()
    };
    
    // 게임 결과 전송
    this.io.emit('game_result', this.gameResult);
    
    // 10초 후 자동으로 다음 게임 준비
    setTimeout(() => {
      this.prepareNextGame();
    }, 10000);
    
    this.gameStarted = false;
  }
  
  // 다음 게임 준비
  prepareNextGame() {
    this.inLobby = true;
    this.gameStarted = false;
    this.liar = null;
    this.spy = null;
    this.category = null;
    this.word = null;
    this.turnOrder = [];
    this.currentTurn = 0;
    this.messages = [];
    this.votingStarted = false;
    this.votes.clear();
    this.gameResult = null;
    
    // 모든 플레이어의 관전자 상태 해제
    this.players.forEach(player => {
      player.isLiar = false;
      player.isSpy = false;
      player.isSpectator = false;
    });
    
    // 로비 상태로 돌아가기
    this.io.emit('return_to_lobby', {
      players: this.getLobbyPlayers()
    });
  }
  
  // 게임 재시작
  restartGame() {
    if (this.gameStarted) return;
    
    this.prepareNextGame();
  }
  
  // 플레이어 점수 정보 반환
  getPlayerScores() {
    const scores = [];
    this.players.forEach(player => {
      if (!player.isSpectator) {
        scores.push({
          id: player.id,
          nickname: player.nickname,
          score: player.score || 0
        });
      }
    });
    return scores;
  }
  
  // 배열 랜덤 섞기 (Fisher-Yates 알고리즘)
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

module.exports = GameManager;