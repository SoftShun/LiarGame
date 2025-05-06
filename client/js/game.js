// 게임 관리 클래스
class GameManager {
  constructor() {
    // 게임 상태
    this.inLobby = true;
    this.gameStarted = false;
    this.votingStarted = false;
    this.isLiar = false;
    this.isSpy = false;
    this.isSpectator = false;
    this.myTurn = false;
    this.currentTurn = null;
    this.category = null;
    this.word = null;
    this.player = {
      id: null,
      nickname: null
    };
    this.players = [];
    this.selectedVote = null;
    
    // 타이머
    this.infoTimer = null;
    this.votingTimer = null;
    this.liarTimer = null;
    this.nextGameTimer = null;
    
    // UI 요소
    this.elements = {
      // 화면
      loadingScreen: document.getElementById('loading-screen'),
      loginScreen: document.getElementById('login-screen'),
      lobbyScreen: document.getElementById('lobby-screen'),
      gameInfoScreen: document.getElementById('game-info-screen'),
      gameScreen: document.getElementById('game-screen'),
      resultScreen: document.getElementById('result-screen'),
      helpModal: document.getElementById('help-modal'),
      
      // 로그인
      nicknameInput: document.getElementById('nickname-input'),
      loginButton: document.getElementById('login-button'),
      loginError: document.getElementById('login-error'),
      
      // 로비
      lobbyPlayerList: document.getElementById('lobby-player-list'),
      gameMode: document.getElementById('game-mode'),
      modeDescription: document.getElementById('mode-description'),
      startGameButton: document.getElementById('start-game-button'),
      
      // 게임 정보
      infoCategory: document.getElementById('info-category'),
      infoRole: document.getElementById('info-role'),
      infoWord: document.getElementById('info-word'),
      infoTimer: document.getElementById('info-timer'),
      
      // 게임
      gameCategory: document.getElementById('game-category'),
      gameWordContainer: document.getElementById('game-word-container'),
      gameWord: document.getElementById('game-word'),
      gameStatusMessage: document.getElementById('game-status-message'),
      helpButton: document.getElementById('help-button'),
      gamePlayerList: document.getElementById('game-player-list'),
      gameMessages: document.getElementById('game-messages'),
      gameInput: document.getElementById('game-input'),
      gameSend: document.getElementById('game-send'),
      
      // 투표
      votingContainer: document.getElementById('voting-container'),
      votingTimer: document.getElementById('voting-timer'),
      votingList: document.getElementById('voting-list'),
      voteButton: document.getElementById('vote-button'),
      
      // 라이어 추측
      liarGuessContainer: document.getElementById('liar-guess-container'),
      liarTimer: document.getElementById('liar-timer'),
      liarGuessInput: document.getElementById('liar-guess-input'),
      liarGuessButton: document.getElementById('liar-guess-button'),
      
      // 자유 채팅
      chatMessages: document.getElementById('chat-messages'),
      chatInput: document.getElementById('chat-input'),
      chatSend: document.getElementById('chat-send'),
      
      // 결과
      resultMessage: document.getElementById('result-message'),
      resultLiar: document.getElementById('result-liar'),
      resultSpyContainer: document.getElementById('result-spy-container'),
      resultSpy: document.getElementById('result-spy'),
      resultCategory: document.getElementById('result-category'),
      resultWord: document.getElementById('result-word'),
      resultScoreList: document.getElementById('result-score-list'),
      nextGameTimer: document.getElementById('next-game-timer'),
      
      // 모달
      closeModal: document.querySelector('.close-modal')
    };
    
    // 이벤트 리스너 초기화
    this.initEventListeners();
  }

  // 이벤트 리스너 초기화
  initEventListeners() {
    // 로그인 이벤트
    this.elements.loginButton.addEventListener('click', () => this.handleLogin());
    this.elements.nicknameInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    
    // 게임 모드 변경 이벤트
    this.elements.gameMode.addEventListener('change', () => this.updateModeDescription());
    
    // 게임 시작 이벤트
    this.elements.startGameButton.addEventListener('click', () => this.handleStartGame());
    
    // 게임 채팅 이벤트
    this.elements.gameSend.addEventListener('click', () => this.handleGameChat());
    this.elements.gameInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') this.handleGameChat();
    });
    
    // 자유 채팅 이벤트
    this.elements.chatSend.addEventListener('click', () => this.handleFreeChat());
    this.elements.chatInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') this.handleFreeChat();
    });
    
    // 투표 이벤트
    this.elements.voteButton.addEventListener('click', () => this.handleVote());
    
    // 라이어 추측 이벤트
    this.elements.liarGuessButton.addEventListener('click', () => this.handleLiarGuess());
    this.elements.liarGuessInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') this.handleLiarGuess();
    });
    
    // 도움말 이벤트
    this.elements.helpButton.addEventListener('click', () => this.openHelpModal());
    this.elements.closeModal.addEventListener('click', () => this.closeHelpModal());
    window.addEventListener('click', (e) => {
      if (e.target === this.elements.helpModal) {
        this.closeHelpModal();
      }
    });
  }

  // 소켓 이벤트 리스너 설정
  setupSocketListeners() {
    // 로비 업데이트
    socketManager.on('lobby_update', (players) => this.handleLobbyUpdate(players));
    
    // 게임 시작
    socketManager.on('game_start', (data) => this.handleGameStart(data));
    
    // 게임 상태 업데이트
    socketManager.on('game_update', (data) => this.handleGameUpdate(data));
    
    // 투표 시작
    socketManager.on('vote_start', (data) => this.handleVoteStart(data));
    
    // 투표 업데이트
    socketManager.on('vote_update', (votes) => this.handleVoteUpdate(votes));
    
    // 라이어 발각
    socketManager.on('liar_caught', (data) => this.handleLiarCaught(data));
    
    // 게임 결과
    socketManager.on('game_result', (data) => this.handleGameResult(data));
    
    // 로비로 돌아가기
    socketManager.on('return_to_lobby', (data) => this.handleReturnToLobby(data));
    
    // 채팅 메시지
    socketManager.on('chat_message', (data) => this.handleChatMessage(data));
  }

  // 로그인 처리
  handleLogin() {
    const nickname = this.elements.nicknameInput.value.trim();
    
    if (!nickname) {
      this.showLoginError('닉네임을 입력하세요.');
      return;
    }
    
    if (nickname.length < 1 || nickname.length > 6) {
      this.showLoginError('닉네임은 1~6자 사이로 입력하세요.');
      return;
    }
    
    // 사용자 정보 설정
    this.player.nickname = nickname;
    
    // 로비 입장
    socketManager.emit('join_lobby', nickname);
    
    // 로그인 화면 숨기고 로비 화면 보이기
    this.showScreen('lobby');
  }

  // 로그인 오류 표시
  showLoginError(message) {
    this.elements.loginError.textContent = message;
  }

  // 게임 모드 설명 업데이트
  updateModeDescription() {
    const mode = this.elements.gameMode.value;
    
    if (mode === 'basic') {
      this.elements.modeDescription.textContent = '기본 모드: 라이어 한 명을 찾아내는 게임입니다.';
    } else if (mode === 'spy') {
      this.elements.modeDescription.textContent = '스파이 모드: 라이어를 돕는 스파이가 추가되는 게임입니다.';
    }
  }

  // 로비 업데이트 처리
  handleLobbyUpdate(players) {
    this.players = players;
    
    // 로비 플레이어 목록 업데이트
    this.updateLobbyPlayerList();
    
    // 플레이어가 3명 이상인 경우 게임 시작 버튼 활성화
    this.elements.startGameButton.disabled = players.length < 3 || players.length > 8;
  }

  // 로비 플레이어 목록 업데이트
  updateLobbyPlayerList() {
    const list = this.elements.lobbyPlayerList;
    list.innerHTML = '';
    
    this.players.forEach(player => {
      const item = document.createElement('li');
      item.textContent = player.nickname;
      
      if (player.isSpectator) {
        item.style.color = '#999';
        item.textContent += ' (관전자)';
      }
      
      list.appendChild(item);
    });
  }

  // 게임 시작 처리
  handleStartGame() {
    const gameMode = this.elements.gameMode.value;
    socketManager.emit('start_game', gameMode);
  }

  // 게임 시작 응답 처리
  handleGameStart(data) {
    this.gameStarted = true;
    this.inLobby = false;
    this.votingStarted = false;
    
    const roleInfo = data.roleInfo;
    this.category = roleInfo.category;
    this.word = roleInfo.word;
    
    // 역할 설정
    if (roleInfo.role === 'liar') {
      this.isLiar = true;
      this.isSpy = false;
    } else if (roleInfo.role === 'spy') {
      this.isLiar = false;
      this.isSpy = true;
    } else {
      this.isLiar = false;
      this.isSpy = false;
    }
    
    // 게임 정보 화면 업데이트
    this.elements.infoCategory.textContent = this.category;
    
    if (this.isLiar) {
      this.elements.infoRole.textContent = '당신은 라이어입니다!';
      this.elements.infoWord.textContent = '제시어를 몰라도 다른 사람들의 설명을 듣고 추측해보세요.';
    } else if (this.isSpy) {
      this.elements.infoRole.textContent = '당신은 스파이입니다!';
      this.elements.infoWord.textContent = `제시어는 "${this.word}"입니다. 라이어가 제시어를 알아차릴 수 있도록 도와주세요.`;
    } else {
      this.elements.infoRole.textContent = '당신은 일반 참가자입니다!';
      this.elements.infoWord.textContent = `제시어는 "${this.word}"입니다. 라이어가 제시어를 알아차리지 못하게 조심하세요.`;
    }
    
    // 게임 정보 화면 표시
    this.showScreen('game-info');
    
    // 4초 타이머 시작
    this.startInfoTimer();
  }

  // 게임 정보 타이머 시작
  startInfoTimer() {
    let timeLeft = 4;
    this.elements.infoTimer.textContent = timeLeft;
    
    this.infoTimer = setInterval(() => {
      timeLeft--;
      this.elements.infoTimer.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(this.infoTimer);
        this.showScreen('game');
        
        // 게임 화면 업데이트
        this.updateGameScreen();
      }
    }, 1000);
  }

  // 게임 화면 업데이트
  updateGameScreen() {
    this.elements.gameCategory.textContent = this.category;
    
    if (this.isLiar) {
      this.elements.gameWordContainer.style.display = 'none';
    } else {
      this.elements.gameWordContainer.style.display = 'block';
      this.elements.gameWord.textContent = this.word;
    }
  }

  // 게임 상태 업데이트 처리
  handleGameUpdate(data) {
    this.currentTurn = data.currentTurn;
    
    // 플레이어 목록 업데이트
    this.updateGamePlayerList(data.turnOrder);
    
    // 메시지 업데이트
    this.updateGameMessages(data.messages);
    
    // 내 턴인지 확인
    this.checkMyTurn(data.turnOrder);
    
    // 투표 중인지 확인
    if (data.votingStarted && !this.votingStarted) {
      this.handleVoteStart({ turnOrder: data.turnOrder });
    }
  }

  // 게임 플레이어 목록 업데이트
  updateGamePlayerList(turnOrder) {
    const list = this.elements.gamePlayerList;
    list.innerHTML = '';
    
    turnOrder.forEach((player, index) => {
      const item = document.createElement('li');
      
      // 현재 차례 강조
      if (index === this.currentTurn) {
        item.classList.add('player-speaking');
      }
      
      // 플레이어 번호 표시
      const numberSpan = document.createElement('span');
      numberSpan.classList.add('player-number');
      numberSpan.textContent = index + 1;
      item.appendChild(numberSpan);
      
      // 플레이어 닉네임 표시
      const nicknameSpan = document.createElement('span');
      nicknameSpan.textContent = player.nickname;
      item.appendChild(nicknameSpan);
      
      // 내 플레이어인 경우 표시
      if (player.id === this.player.id) {
        item.style.fontWeight = 'bold';
        item.dataset.id = player.id;
      } else {
        item.dataset.id = player.id;
      }
      
      list.appendChild(item);
    });
  }

  // 게임 메시지 업데이트
  updateGameMessages(messages) {
    const container = this.elements.gameMessages;
    container.innerHTML = '';
    
    messages.forEach(msg => {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('game-message');
      
      const nicknameSpan = document.createElement('span');
      nicknameSpan.classList.add('game-message-nickname');
      nicknameSpan.textContent = msg.nickname;
      
      const messageContent = document.createElement('p');
      messageContent.textContent = msg.message;
      
      messageDiv.appendChild(nicknameSpan);
      messageDiv.appendChild(messageContent);
      container.appendChild(messageDiv);
    });
    
    // 스크롤을 최하단으로 이동
    container.scrollTop = container.scrollHeight;
  }

  // 내 턴인지 확인
  checkMyTurn(turnOrder) {
    this.myTurn = false;
    
    turnOrder.forEach((player, index) => {
      if (player.id === this.player.id && index === this.currentTurn) {
        this.myTurn = true;
      }
    });
    
    // 내 턴이면 입력창 활성화, 아니면 비활성화
    this.elements.gameInput.disabled = !this.myTurn;
    this.elements.gameSend.disabled = !this.myTurn;
    
    // 상태 메시지 업데이트
    if (this.myTurn) {
      this.elements.gameStatusMessage.textContent = '당신의 차례입니다. 제시어에 대해 설명해보세요.';
    } else {
      this.elements.gameStatusMessage.textContent = '다른 플레이어의 차례입니다.';
    }
  }

  // 게임 채팅 처리
  handleGameChat() {
    if (!this.myTurn) return;
    
    const message = this.elements.gameInput.value.trim();
    
    if (!message) return;
    
    if (message.length > 40) {
      alert('메시지는 40자를 초과할 수 없습니다.');
      return;
    }
    
    // 서버로 메시지 전송
    socketManager.emit('game_chat', message);
    
    // 입력창 초기화
    this.elements.gameInput.value = '';
  }

  // 자유 채팅 처리
  handleFreeChat() {
    const message = this.elements.chatInput.value.trim();
    
    if (!message) return;
    
    // 서버로 메시지 전송
    socketManager.emit('chat_message', message);
    
    // 입력창 초기화
    this.elements.chatInput.value = '';
  }

  // 채팅 메시지 처리
  handleChatMessage(data) {
    const container = this.elements.chatMessages;
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message');
    
    const nicknameSpan = document.createElement('span');
    nicknameSpan.classList.add('chat-nickname');
    nicknameSpan.textContent = data.nickname + ': ';
    
    const messageContent = document.createTextNode(data.message);
    
    messageDiv.appendChild(nicknameSpan);
    messageDiv.appendChild(messageContent);
    container.appendChild(messageDiv);
    
    // 스크롤을 최하단으로 이동
    container.scrollTop = container.scrollHeight;
  }

  // 투표 시작 처리
  handleVoteStart(data) {
    this.votingStarted = true;
    
    // 투표 컨테이너 표시
    this.elements.votingContainer.style.display = 'block';
    
    // 투표 목록 업데이트
    this.updateVotingList(data.turnOrder);
    
    // 투표 타이머 시작
    this.startVotingTimer();
  }

  // 투표 목록 업데이트
  updateVotingList(turnOrder) {
    const list = this.elements.votingList;
    list.innerHTML = '';
    
    turnOrder.forEach(player => {
      // 자기 자신은 투표 목록에서 제외
      if (player.id === this.player.id) return;
      
      const item = document.createElement('li');
      item.textContent = player.nickname;
      item.dataset.id = player.id;
      
      // 클릭 이벤트 추가
      item.addEventListener('click', () => this.selectVote(player.id));
      
      list.appendChild(item);
    });
  }

  // 투표 타이머 시작
  startVotingTimer() {
    let timeLeft = 20;
    this.elements.votingTimer.textContent = timeLeft;
    
    this.votingTimer = setInterval(() => {
      timeLeft--;
      this.elements.votingTimer.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(this.votingTimer);
        
        // 타이머가 끝났는데 투표를 안했으면 자동 기권
        if (this.selectedVote === null) {
          this.elements.votingContainer.style.display = 'none';
        }
      }
    }, 1000);
  }

  // 투표 대상 선택
  selectVote(playerId) {
    this.selectedVote = playerId;
    
    // 선택된 항목 강조
    const items = this.elements.votingList.querySelectorAll('li');
    items.forEach(item => {
      if (item.dataset.id === playerId) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // 투표 처리
  handleVote() {
    if (this.selectedVote === null) {
      alert('투표할 대상을 선택하세요.');
      return;
    }
    
    // 서버로 투표 결과 전송
    socketManager.emit('vote_submit', this.selectedVote);
    
    // 투표 버튼 비활성화
    this.elements.voteButton.disabled = true;
    this.elements.voteButton.textContent = '투표 완료';
  }

  // 투표 업데이트 처리
  handleVoteUpdate(votes) {
    // 투표 현황 UI 업데이트 (필요하다면)
  }

  // 라이어 발각 처리
  handleLiarCaught(data) {
    // 내가 라이어라면 추측 UI 표시
    if (data.liarId === this.player.id) {
      this.elements.liarGuessContainer.style.display = 'block';
      this.startLiarTimer();
    } else {
      // 다른 플레이어들에게는 라이어가 단어를 추측 중이라고 표시
      this.elements.gameStatusMessage.textContent = `${data.nickname}님이 라이어로 지목되어 단어를 추측하고 있습니다.`;
    }
  }

  // 라이어 타이머 시작
  startLiarTimer() {
    let timeLeft = 20;
    this.elements.liarTimer.textContent = timeLeft;
    
    this.liarTimer = setInterval(() => {
      timeLeft--;
      this.elements.liarTimer.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(this.liarTimer);
        this.elements.liarGuessContainer.style.display = 'none';
      }
    }, 1000);
  }

  // 라이어 추측 처리
  handleLiarGuess() {
    const guess = this.elements.liarGuessInput.value.trim();
    
    if (!guess) {
      alert('추측할 단어를 입력하세요.');
      return;
    }
    
    // 서버로 추측 전송
    socketManager.emit('liar_guess', guess);
    
    // 추측 UI 숨기기
    this.elements.liarGuessContainer.style.display = 'none';
    
    // 타이머 정지
    clearInterval(this.liarTimer);
  }

  // 게임 결과 처리
  handleGameResult(data) {
    this.gameStarted = false;
    this.votingStarted = false;
    
    // 타이머 정지
    clearInterval(this.votingTimer);
    clearInterval(this.liarTimer);
    
    // 결과 화면 업데이트
    this.elements.resultMessage.textContent = data.message;
    this.elements.resultLiar.textContent = data.liar.nickname;
    
    if (data.spy) {
      this.elements.resultSpyContainer.style.display = 'block';
      this.elements.resultSpy.textContent = data.spy.nickname;
    } else {
      this.elements.resultSpyContainer.style.display = 'none';
    }
    
    this.elements.resultCategory.textContent = data.category;
    this.elements.resultWord.textContent = data.word;
    
    // 점수 목록 업데이트
    this.updateResultScores(data.scores);
    
    // 결과 화면 표시
    this.showScreen('result');
    
    // 다음 게임 타이머 시작
    this.startNextGameTimer();
  }

  // 결과 점수 업데이트
  updateResultScores(scores) {
    const list = this.elements.resultScoreList;
    list.innerHTML = '';
    
    // 점수 내림차순 정렬
    scores.sort((a, b) => b.score - a.score);
    
    scores.forEach(player => {
      const item = document.createElement('li');
      
      const nicknameSpan = document.createElement('span');
      nicknameSpan.textContent = player.nickname;
      
      const scoreSpan = document.createElement('span');
      scoreSpan.textContent = player.score + '점';
      
      item.appendChild(nicknameSpan);
      item.appendChild(scoreSpan);
      
      // 내 플레이어인 경우 강조
      if (player.id === this.player.id) {
        item.style.fontWeight = 'bold';
      }
      
      list.appendChild(item);
    });
  }

  // 다음 게임 타이머 시작
  startNextGameTimer() {
    let timeLeft = 10;
    this.elements.nextGameTimer.textContent = timeLeft;
    
    this.nextGameTimer = setInterval(() => {
      timeLeft--;
      this.elements.nextGameTimer.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(this.nextGameTimer);
      }
    }, 1000);
  }

  // 로비로 돌아가기 처리
  handleReturnToLobby(data) {
    this.inLobby = true;
    this.gameStarted = false;
    this.votingStarted = false;
    this.isLiar = false;
    this.isSpy = false;
    this.isSpectator = false;
    this.selectedVote = null;
    
    // 타이머 정지
    clearInterval(this.nextGameTimer);
    
    // 플레이어 목록 업데이트
    this.players = data.players;
    this.updateLobbyPlayerList();
    
    // 로비 화면 표시
    this.showScreen('lobby');
  }

  // 도움말 모달 열기
  openHelpModal() {
    this.elements.helpModal.style.display = 'block';
  }

  // 도움말 모달 닫기
  closeHelpModal() {
    this.elements.helpModal.style.display = 'none';
  }

  // 화면 전환
  showScreen(screenName) {
    // 모든 화면 숨기기
    this.elements.loadingScreen.style.display = 'none';
    this.elements.loginScreen.style.display = 'none';
    this.elements.lobbyScreen.style.display = 'none';
    this.elements.gameInfoScreen.style.display = 'none';
    this.elements.gameScreen.style.display = 'none';
    this.elements.resultScreen.style.display = 'none';
    
    // 지정된 화면 표시
    switch (screenName) {
      case 'loading':
        this.elements.loadingScreen.style.display = 'flex';
        break;
      case 'login':
        this.elements.loginScreen.style.display = 'flex';
        break;
      case 'lobby':
        this.elements.lobbyScreen.style.display = 'block';
        break;
      case 'game-info':
        this.elements.gameInfoScreen.style.display = 'flex';
        break;
      case 'game':
        this.elements.gameScreen.style.display = 'block';
        break;
      case 'result':
        this.elements.resultScreen.style.display = 'flex';
        break;
    }
  }
}

// 게임 매니저 인스턴스 생성
const gameManager = new GameManager();