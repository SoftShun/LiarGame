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
    this.isHost = false;
    this.myTurn = false;
    this.currentTurn = null;
    this.category = null;
    this.word = null;
    this.gameStage = 'speech'; // 게임 단계 추가: speech, vote, result
    this.isFoolMode = false; // 바보 모드 여부
    this.isFakeWord = false; // 가짜 단어 여부
    this.isFool = false; // 바보 플래그 (서버에서만 활성화)
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
    this.turnProgressTimer = null; // 턴 진행 타이머 추가
    
    // 자동 스크롤 관련
    this.userScrolled = false;
    this.scrollObserver = null;
    
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
      gameProgressBar: document.getElementById('game-progress-bar'), // 진행 상태 바
      
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
    
    // 스크롤 관찰자 초기화
    this.initScrollObservers();
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

  // 스크롤 관찰자 초기화 (채팅창 자동 스크롤 문제 해결)
  initScrollObservers() {
    // 게임 메시지 컨테이너 스크롤 이벤트
    this.elements.gameMessages.addEventListener('scroll', () => {
      const container = this.elements.gameMessages;
      const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
      this.userScrolled = !isScrolledToBottom;
    });
    
    // 자유 채팅 컨테이너 스크롤 이벤트
    this.elements.chatMessages.addEventListener('scroll', () => {
      const container = this.elements.chatMessages;
      const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
      this.userScrolled = !isScrolledToBottom;
    });
    
    // ResizeObserver 사용하여 컨테이너 크기 변경 시 스크롤 조정
    if (window.ResizeObserver) {
      this.scrollObserver = new ResizeObserver(entries => {
        entries.forEach(entry => {
          if (!this.userScrolled) {
            entry.target.scrollTop = entry.target.scrollHeight;
          }
        });
      });
      
      this.scrollObserver.observe(this.elements.gameMessages);
      this.scrollObserver.observe(this.elements.chatMessages);
    }
  }

  // 소켓 이벤트 리스너 설정
  setupSocketListeners() {
    // 플레이어 정보 업데이트 (방장 정보 처리)
    socketManager.on('player_info_updated', (data) => {
      this.isHost = data.isHost;
      this.player.id = data.id;
      this.player.nickname = data.nickname;
      this.updateStartButton();
    });
    
    // 방장 변경 처리
    socketManager.on('host_changed', (data) => {
      this.isHost = socketManager.isHost;
      this.updateStartButton();
      
      // 방장 변경 알림
      if (this.isHost) {
        alert(`이전 방장이 나가서 당신이 새로운 방장이 되었습니다.`);
      }
    });
    
    // 턴 변경 이벤트 처리
    socketManager.on('turn_changed', (data) => {
      // 턴 타이머 리셋
      if (this.turnProgressTimer) {
        clearInterval(this.turnProgressTimer);
      }
      
      // 새로운 턴이 자신의 턴인지 확인
      if (data.playerId === this.player.id) {
        this.myTurn = true;
        // 자동 포커스
        setTimeout(() => {
          this.elements.gameInput.focus();
        }, 200);
      } else {
        this.myTurn = false;
      }
    });
    
    // 기존 리스너 유지
    socketManager.on('lobby_update', (players) => this.handleLobbyUpdate(players));
    socketManager.on('game_start', (data) => this.handleGameStart(data));
    socketManager.on('game_update', (data) => this.handleGameUpdate(data));
    socketManager.on('vote_start', (data) => this.handleVoteStart(data));
    socketManager.on('vote_update', (votes) => this.handleVoteUpdate(votes));
    socketManager.on('liar_caught', (data) => this.handleLiarCaught(data));
    socketManager.on('game_result', (data) => this.handleGameResult(data));
    socketManager.on('return_to_lobby', (data) => this.handleReturnToLobby(data));
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
      this.elements.modeDescription.innerHTML = '<span class="mode-icon basic"></span>기본 모드: 라이어 한 명을 찾아내는 게임입니다.';
    } else if (mode === 'spy') {
      this.elements.modeDescription.innerHTML = '<span class="mode-icon spy"></span>스파이 모드: 라이어를 돕는 스파이가 추가되는 게임입니다.';
    } else if (mode === 'fool') {
      this.elements.modeDescription.innerHTML = '<span class="mode-icon fool"></span>바보 모드: 바보는 자신이 바보인지 모르고 다른 제시어를 받는 모드입니다.';
    }
  }

  // 로비 업데이트 처리
  handleLobbyUpdate(players) {
    this.players = players;
    this.updateLobbyPlayerList();
    this.updateStartButton();
  }

  // 로비 플레이어 목록 업데이트
  updateLobbyPlayerList() {
    const list = this.elements.lobbyPlayerList;
    list.innerHTML = '';
    
    this.players.forEach(player => {
      const item = document.createElement('li');
      
      // 방장 표시 추가
      if (player.isHost) {
        const hostBadge = document.createElement('span');
        hostBadge.classList.add('host-badge');
        hostBadge.textContent = '방장';
        item.appendChild(hostBadge);
      }
      
      const nickname = document.createElement('span');
      nickname.textContent = player.nickname;
      item.appendChild(nickname);
      
      // 관전자 표시
      if (player.isSpectator) {
        const spectatorBadge = document.createElement('span');
        spectatorBadge.classList.add('spectator-badge');
        spectatorBadge.textContent = '(관전)';
        item.appendChild(spectatorBadge);
      }
      
      // 본인 표시
      if (player.id === this.player.id) {
        item.classList.add('current-player');
      }
      
      list.appendChild(item);
    });
  }

  // 게임 시작 처리
  handleStartGame() {
    // 방장만 게임 시작 가능
    if (!this.isHost) {
      alert('방장만 게임을 시작할 수 있습니다.');
      return;
    }
    
    const gameMode = this.elements.gameMode.value;
    socketManager.emit('start_game', gameMode);
  }

  // 게임 시작 응답 처리
  handleGameStart(data) {
    this.gameStarted = true;
    this.inLobby = false;
    this.votingStarted = false;
    this.gameStage = 'speech'; // 게임 단계 초기화
    this.updateGameProgress(); // 게임 진행 상태 표시기 업데이트
    
    const roleInfo = data.roleInfo;
    this.category = roleInfo.category;
    this.word = roleInfo.word;
    this.isFoolMode = data.foolMode || false; // 바보 모드 정보 저장
    this.isFakeWord = roleInfo.isFakeWord || false; // 가짜 단어 여부
    this.isFool = roleInfo.isFool || false; // 바보 플래그 (서버에서만 활성화)
    
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
      
      if (this.isFoolMode) {
        // 일반 라이어 모드
        this.elements.infoWord.textContent = '제시어를 몰라도 다른 사람들의 설명을 듣고 추측해보세요.';
      } else {
        this.elements.infoWord.textContent = '제시어를 몰라도 다른 사람들의 설명을 듣고 추측해보세요.';
      }
    } else if (this.isSpy) {
      this.elements.infoRole.textContent = '당신은 스파이입니다!';
      this.elements.infoWord.textContent = `제시어는 "${this.word}"입니다. 라이어가 제시어를 알아차릴 수 있도록 도와주세요.`;
    } else {
      this.elements.infoRole.textContent = '당신은 일반 참가자입니다!';
      this.elements.infoWord.textContent = `제시어는 "${this.word}"입니다. 라이어가 제시어를 알아차리지 못하게 조심하세요.`;
      
      // 서버로부터 받은 isFool 플래그가 없으면 바보가 아님
      if (this.isFoolMode && !this.isFool) {
        this.elements.infoWord.innerHTML = `제시어는 <strong>"${this.word}"</strong>입니다. 이 게임에는 바보가 있으며, 바보는 다른 제시어를 받았습니다. 설명을 듣고 누가 바보인지 찾아보세요.`;
      }
    }
    
    // 바보 모드면 힌트 추가
    if (this.isFoolMode) {
      const modeHint = document.createElement('div');
      modeHint.classList.add('mode-hint');
      modeHint.innerHTML = '<span class="mode-icon fool"></span><strong>바보 모드:</strong> 한 명이 다른 제시어를 받았습니다!';
      
      // 이미 infoWord에 내용이 있으므로 append 사용
      this.elements.infoWord.appendChild(modeHint);
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

  // 게임 진행 상태 표시기 업데이트
  updateGameProgress() {
    const progressSteps = this.elements.gameProgressBar.querySelectorAll('.progress-step');
    
    progressSteps.forEach(step => {
      step.classList.remove('active', 'completed');
      
      if (step.dataset.step === this.gameStage) {
        step.classList.add('active');
      } else if ((this.gameStage === 'vote' && step.dataset.step === 'speech') || 
                 (this.gameStage === 'result' && (step.dataset.step === 'speech' || step.dataset.step === 'vote'))) {
        step.classList.add('completed');
      }
    });
  }

  // 게임 화면 업데이트
  updateGameScreen() {
    this.elements.gameCategory.textContent = this.category;
    
    // 진행 상태 표시기 업데이트
    this.updateGameProgress();
    
    if (this.isLiar && !this.isFoolMode) {
      // 일반 모드의 라이어는 제시어 표시 안함
      this.elements.gameWordContainer.style.display = 'none';
    } else {
      // 플레이어나 바보 모드의 모든 플레이어는 제시어 표시
      this.elements.gameWordContainer.style.display = 'block';
      this.elements.gameWord.textContent = this.word;
      
      // 바보 모드면 아이콘 표시
      if (this.isFoolMode) {
        const foolIcon = document.createElement('span');
        foolIcon.classList.add('mode-icon', 'fool');
        foolIcon.title = '바보 모드';
        this.elements.gameWord.parentNode.insertBefore(foolIcon, this.elements.gameWord);
      }
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
      this.gameStage = 'vote'; // 단계 변경
      this.updateGameProgress(); // 진행 상태 표시기 업데이트
      this.handleVoteStart({ turnOrder: data.turnOrder });
    }
  }

  // 게임 플레이어 목록 업데이트 (턴 타이머 추가)
  updateGamePlayerList(turnOrder) {
    const list = this.elements.gamePlayerList;
    list.innerHTML = '';
    
    turnOrder.forEach((player, index) => {
      const item = document.createElement('li');
      
      // 현재 차례 강조
      if (index === this.currentTurn) {
        item.classList.add('player-speaking');
        
        // 턴 표시기 추가
        const turnIndicator = document.createElement('span');
        turnIndicator.classList.add('player-turn-indicator');
        turnIndicator.innerHTML = '&#9654;'; // 화살표 표시
        item.prepend(turnIndicator);
        
        // 턴 진행 표시줄 추가
        const turnProgress = document.createElement('div');
        turnProgress.classList.add('turn-progress');
        item.appendChild(turnProgress);
        
        // 턴 타이머 표시 추가
        const turnTimer = document.createElement('span');
        turnTimer.classList.add('turn-timer');
        turnTimer.textContent = '30';
        turnTimer.id = 'current-turn-timer';
        item.appendChild(turnTimer);
        
        // 진행 애니메이션 시작
        setTimeout(() => {
          turnProgress.style.width = '100%';
          
          // 30초 턴 타이머 시작
          this.startTurnTimer();
        }, 10);
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

  // 턴 타이머 시작
  startTurnTimer() {
    // 이전 타이머 제거
    if (this.turnProgressTimer) {
      clearInterval(this.turnProgressTimer);
    }
    
    const timerElement = document.getElementById('current-turn-timer');
    if (!timerElement) return;
    
    let timeLeft = 30;
    timerElement.textContent = timeLeft;
    
    this.turnProgressTimer = setInterval(() => {
      timeLeft--;
      if (timerElement) {
        timerElement.textContent = timeLeft;
      }
      
      if (timeLeft <= 10) {
        // 10초 이하면 경고 색상으로 변경
        if (timerElement) {
          timerElement.classList.add('turn-timer-warning');
        }
      }
      
      if (timeLeft <= 0) {
        clearInterval(this.turnProgressTimer);
        // 시간이 다 되면 자동으로 다음 턴으로 넘어감
        if (this.myTurn) {
          this.handleGameChat(true); // 자동 시간 초과 플래그 전달
        }
      }
    }, 1000);
  }

  // 게임 메시지 업데이트 (스크롤 문제 해결)
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
    
    // 사용자가 스크롤하지 않았거나 강제 스크롤이 필요한 경우만 스크롤 조정
    if (!this.userScrolled) {
      // 스크롤을 최하단으로 이동 (setTimeout으로 비동기 처리하여 DOM 업데이트 후 스크롤)
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 0);
    }
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

  // 게임 채팅 처리 (스크롤 문제 해결 추가 + 턴 타이머 추가)
  handleGameChat(timeOut = false) {
    if (!this.myTurn) return;
    
    let message = this.elements.gameInput.value.trim();
    
    // 시간이 초과된 경우 자동 메시지 생성
    if (timeOut && !message) {
      message = "(시간 초과)";
    }
    
    if (!message) return;
    
    if (message.length > 40) {
      alert('메시지는 40자를 초과할 수 없습니다.');
      return;
    }
    
    // 턴 타이머 중지
    if (this.turnProgressTimer) {
      clearInterval(this.turnProgressTimer);
    }
    
    // 서버로 메시지 전송
    socketManager.emit('game_chat', message);
    
    // 입력창 초기화
    this.elements.gameInput.value = '';
    
    // 스크롤 강제 아래로 이동
    this.userScrolled = false;
  }

  // 자유 채팅 처리 (스크롤 문제 해결 추가)
  handleFreeChat() {
    const message = this.elements.chatInput.value.trim();
    
    if (!message) return;
    
    // 서버로 메시지 전송
    socketManager.emit('chat_message', message);
    
    // 입력창 초기화
    this.elements.chatInput.value = '';
    
    // 스크롤 강제 아래로 이동
    this.userScrolled = false;
  }

  // 채팅 메시지 처리 (스크롤 문제 해결)
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
    
    // 사용자가 스크롤하지 않았거나 강제 스크롤이 필요한 경우만 스크롤 조정
    if (!this.userScrolled) {
      // 스크롤을 최하단으로 이동 (setTimeout으로 비동기 처리하여 DOM 업데이트 후 스크롤)
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 0);
    }
  }

  // 투표 시작 처리
  handleVoteStart(data) {
    this.votingStarted = true;
    this.gameStage = 'vote';
    this.updateGameProgress();
    
    // 투표 컨테이너 표시
    this.elements.votingContainer.style.display = 'block';
    
    // 투표 목록 업데이트
    this.updateVotingList(data.turnOrder);
    
    // 투표 타이머 시작
    this.startVotingTimer();
    
    // 상태 메시지 업데이트
    this.elements.gameStatusMessage.textContent = '누가 라이어인지 투표하세요.';
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
    // 상태 메시지 업데이트
    if (data.liarId === this.player.id) {
      this.elements.liarGuessContainer.style.display = 'block';
      this.elements.gameStatusMessage.innerHTML = `
        <strong>당신이 라이어로 지목되었습니다!</strong><br>
        제시어를 맞추면 승리합니다. 단어를 추측해보세요!
      `;
      this.startLiarTimer();
    } else {
      // 다른 플레이어들에게는 라이어가 단어를 추측 중이라고 표시
      this.elements.gameStatusMessage.innerHTML = `
        <strong>${data.nickname}님이 라이어로 지목되었습니다.</strong><br>
        라이어가 단어를 추측하고 있습니다...
      `;
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

  // 게임 결과 처리 (자동 재시작 방지 + 역할 뱃지 추가)
  handleGameResult(data) {
    this.gameStarted = false;
    this.votingStarted = false;
    this.gameStage = 'result';
    this.updateGameProgress();
    
    // 타이머 정지
    clearInterval(this.votingTimer);
    clearInterval(this.liarTimer);
    
    // 결과 화면 업데이트
    this.elements.resultMessage.textContent = data.message;
    
    // 라이어 정보 (역할 뱃지 추가)
    this.elements.resultLiar.innerHTML = '';
    const liarName = document.createTextNode(data.liar.nickname);
    this.elements.resultLiar.appendChild(liarName);
    
    const liarBadge = document.createElement('span');
    liarBadge.classList.add('role-badge', 'liar');
    liarBadge.textContent = '라이어';
    this.elements.resultLiar.appendChild(liarBadge);
    
    // 스파이 정보 (있는 경우)
    if (data.spy) {
      this.elements.resultSpyContainer.style.display = 'block';
      
      this.elements.resultSpy.innerHTML = '';
      const spyName = document.createTextNode(data.spy.nickname);
      this.elements.resultSpy.appendChild(spyName);
      
      const spyBadge = document.createElement('span');
      spyBadge.classList.add('role-badge', 'spy');
      spyBadge.textContent = '스파이';
      this.elements.resultSpy.appendChild(spyBadge);
    } else {
      this.elements.resultSpyContainer.style.display = 'none';
    }
    
    this.elements.resultCategory.textContent = data.category;
    this.elements.resultWord.textContent = data.word;
    
    // 바보 모드 표시 (아이콘 추가)
    if (this.isFoolMode) {
      const foolIcon = document.createElement('span');
      foolIcon.classList.add('mode-icon', 'fool');
      foolIcon.title = '바보 모드';
      this.elements.resultWord.parentNode.insertBefore(foolIcon, this.elements.resultWord);
    }
    
    // 점수 목록 업데이트
    this.updateResultScores(data.scores);
    
    // 결과 화면 표시
    this.showScreen('result');
    
    // 자동 재시작 타이머 제거 (방장이 수동으로 시작하도록 변경)
    clearInterval(this.nextGameTimer);
    
    // 방장용 재시작 버튼 표시
    this.updateRestartButton();
  }

  // 결과 점수 업데이트
  updateResultScores(scores) {
    const list = this.elements.resultScoreList;
    list.innerHTML = '';
    
    // 점수 내림차순 정렬
    scores.sort((a, b) => b.score - a.score);
    
    scores.forEach((player, index) => {
      const item = document.createElement('li');
      
      // 등수 표시 (1위에게 아이콘 추가)
      if (index === 0) {
        const rankIcon = document.createElement('span');
        rankIcon.classList.add('rank-icon');
        rankIcon.innerHTML = '&#128081;'; // 왕관 이모지
        item.appendChild(rankIcon);
      } else {
        const rankNumber = document.createElement('span');
        rankNumber.classList.add('rank-number');
        rankNumber.textContent = (index + 1) + '. ';
        item.appendChild(rankNumber);
      }
      
      const nicknameSpan = document.createElement('span');
      nicknameSpan.textContent = player.nickname;
      
      const scoreSpan = document.createElement('span');
      scoreSpan.textContent = player.score + '점';
      
      item.appendChild(nicknameSpan);
      item.appendChild(scoreSpan);
      
      // 내 플레이어인 경우 강조
      if (player.id === this.player.id) {
        item.classList.add('current-player');
      }
      
      list.appendChild(item);
    });
  }

  // 재시작 버튼 업데이트
  updateRestartButton() {
    // 기존 다음 게임 시작 타이머 정보 제거
    const nextGameInfo = document.querySelector('.result-next');
    if (nextGameInfo) {
      nextGameInfo.innerHTML = '';
      
      // 방장인 경우 재시작 버튼 추가
      if (this.isHost) {
        const restartButton = document.createElement('button');
        restartButton.id = 'restart-game-button';
        restartButton.textContent = '게임 재시작';
        restartButton.addEventListener('click', () => this.handleRestartGame());
        nextGameInfo.appendChild(restartButton);
      } else {
        // 방장이 아닌 경우 안내 메시지 표시
        const waitMessage = document.createElement('p');
        waitMessage.textContent = '방장이 게임을 재시작할 때까지 기다려주세요.';
        nextGameInfo.appendChild(waitMessage);
      }
    }
  }

  // 게임 재시작 처리
  handleRestartGame() {
    if (!this.isHost) {
      alert('방장만 게임을 재시작할 수 있습니다.');
      return;
    }
    
    const gameMode = this.elements.gameMode.value;
    socketManager.emit('restart_game', gameMode);
  }

  // 다음 게임 타이머 시작 (사용하지 않음 - 기존 코드 오버라이드)
  startNextGameTimer() {
    // 자동 재시작을 사용하지 않으므로 빈 메서드로 오버라이드
    clearInterval(this.nextGameTimer);
  }

  // 로비로 돌아가기 처리
  handleReturnToLobby(data) {
    this.inLobby = true;
    this.gameStarted = false;
    this.votingStarted = false;
    this.isLiar = false;
    this.isSpy = false;
    this.isSpectator = false;
    this.isFoolMode = false; // 바보 모드 초기화
    this.selectedVote = null;
    this.gameStage = 'speech'; // 게임 단계 초기화
    
    // 타이머 정지
    clearInterval(this.nextGameTimer);
    
    // 플레이어 목록 업데이트
    this.players = data.players;
    this.updateLobbyPlayerList();
    
    // 로비 화면 표시
    this.showScreen('lobby');
    
    // 시작 버튼 업데이트 (방장만 표시)
    this.updateStartButton();
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

  // 시작 버튼 업데이트 (방장만 게임 시작 가능)
  updateStartButton() {
    if (this.elements.startGameButton) {
      if (this.isHost) {
        this.elements.startGameButton.style.display = 'block';
        this.elements.startGameButton.textContent = '게임 시작';
      } else {
        this.elements.startGameButton.style.display = 'none';
      }
    }
  }
}

// 게임 매니저 인스턴스 생성
const gameManager = new GameManager();