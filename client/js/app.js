// 애플리케이션 초기화 및 메인 로직
document.addEventListener('DOMContentLoaded', async function() {
  console.log('DOM이 로드되었습니다. 애플리케이션 초기화를 시작합니다...');
  
  try {
    // 로딩 화면 표시
    console.log('로딩 화면을 표시합니다...');
    if (gameManager && typeof gameManager.showScreen === 'function') {
      gameManager.showScreen('loading');
      console.log('로딩 화면 표시 완료');
    } else {
      console.error('gameManager가 정의되지 않았거나 showScreen 메서드가 없습니다.');
      alert('게임 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
      return;
    }
    
    // 게임 상태 리셋
    console.log('게임 상태를 초기화합니다...');
    if (typeof gameManager.resetGame === 'function') {
      // resetGame 함수가 이미 정의되어 있다면 호출
      const resetResult = gameManager.resetGame();
      console.log('게임 상태 초기화 완료:', resetResult);
    } else {
      // 기본적인 게임 상태 초기화
      console.warn('resetGame 함수가 없습니다. 수동으로 상태를 초기화합니다.');
      gameManager.inLobby = true;
      gameManager.gameStarted = false;
      gameManager.votingStarted = false;
      gameManager.isLiar = false;
      gameManager.isSpy = false;
      gameManager.isSpectator = false;
      gameManager.myTurn = false;
      gameManager.currentTurn = null;
      gameManager.category = null;
      gameManager.word = null;
      gameManager.gameStage = 'speech';
      gameManager.isFoolMode = false;
      gameManager.isFakeWord = false;
      gameManager.isFool = false;
      gameManager.player = {
        id: null,
        nickname: null
      };
      gameManager.players = [];
      gameManager.selectedVote = null;
      gameManager.infoConfirmed = false;
      if (gameManager.confirmedPlayers instanceof Set) {
        gameManager.confirmedPlayers.clear();
      } else {
        gameManager.confirmedPlayers = new Set();
      }
    }
    
    // 소켓 연결 시도
    console.log('서버에 연결을 시도합니다...');
    try {
      // socketManager가 존재하는지 확인
      if (!socketManager || typeof socketManager.connect !== 'function') {
        throw new Error('socketManager가 정의되지 않았거나 connect 메서드가 없습니다.');
      }
      
      await socketManager.connect();
      console.log('서버에 성공적으로 연결되었습니다.');
      
      // 소켓 이벤트 리스너 설정
      console.log('소켓 이벤트 리스너를 설정합니다...');
      if (typeof gameManager.setupSocketListeners === 'function') {
        gameManager.setupSocketListeners();
        console.log('소켓 이벤트 리스너 설정 완료');
      } else {
        console.error('gameManager.setupSocketListeners 메서드가 없습니다.');
      }
      
      // 연결 성공 시 로그인 화면으로 이동
      console.log('로그인 화면으로 전환합니다...');
      gameManager.showScreen('login');
      console.log('로그인 화면 전환 완료');
      
      // 로컬 스토리지에서 닉네임 불러오기 (이전에 사용한 닉네임이 있으면)
      const savedNickname = localStorage.getItem('liar-game-nickname');
      if (savedNickname) {
        console.log('저장된 닉네임을 불러옵니다:', savedNickname);
        const nicknameInput = document.getElementById('nickname-input');
        if (nicknameInput) {
          nicknameInput.value = savedNickname;
          console.log('닉네임 입력 필드에 저장된 닉네임을 설정했습니다.');
        } else {
          console.warn('닉네임 입력 필드를 찾을 수 없습니다.');
        }
      } else {
        console.log('저장된 닉네임이 없습니다.');
      }
    } catch (socketError) {
      console.error('소켓 연결 오류:', socketError);
      // 로딩 화면을 숨기고 오류 메시지 표시
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        console.log('연결 오류 메시지를 표시합니다...');
        const errorMsg = document.createElement('div');
        errorMsg.className = 'connection-error';
        errorMsg.innerHTML = `
          <h2>서버 연결 실패</h2>
          <p>${socketError.message || '서버에 연결할 수 없습니다.'}</p>
          <button onclick="window.location.reload()">다시 시도</button>
        `;
        
        // 로딩 스피너 숨기기
        const spinner = loadingScreen.querySelector('.spinner');
        if (spinner) spinner.style.display = 'none';
        
        // 로딩 메시지 숨기기
        const loadingMessage = loadingScreen.querySelector('p');
        if (loadingMessage) loadingMessage.style.display = 'none';
        
        // 오류 메시지 추가
        loadingScreen.querySelector('.loading-container').appendChild(errorMsg);
        console.log('연결 오류 메시지 표시 완료');
      } else {
        console.error('로딩 화면 요소를 찾을 수 없습니다.');
        alert('서버 연결에 실패했습니다. 페이지를 새로고침하거나 나중에 다시 시도해주세요.');
      }
    }
  } catch (error) {
    console.error('초기화 중 예외 발생:', error);
    alert('애플리케이션 초기화 중 오류가 발생했습니다: ' + error.message);
  }
  
  // DOM 요소 확인을 통한 디버깅
  console.log('화면 요소 확인:');
  console.log('- 로딩 화면:', document.getElementById('loading-screen') ? '존재함' : '존재하지 않음');
  console.log('- 로그인 화면:', document.getElementById('login-screen') ? '존재함' : '존재하지 않음');
  console.log('- 로비 화면:', document.getElementById('lobby-screen') ? '존재함' : '존재하지 않음');
  console.log('- 게임 정보 화면:', document.getElementById('game-info-screen') ? '존재함' : '존재하지 않음');
  console.log('- 게임 화면:', document.getElementById('game-screen') ? '존재함' : '존재하지 않음');
  console.log('- 결과 화면:', document.getElementById('result-screen') ? '존재함' : '존재하지 않음');
});

// 로그인 성공 시 플레이어 ID 저장 함수
function setPlayerId(id) {
  console.log('플레이어 ID 설정:', id);
  
  if (!gameManager || !gameManager.player) {
    console.error('gameManager 또는 player 객체가 정의되지 않았습니다.');
    return;
  }
  
  gameManager.player.id = id;
  
  // 닉네임이 있을 때만 로컬 스토리지에 저장
  if (gameManager.player.nickname) {
    localStorage.setItem('liar-game-nickname', gameManager.player.nickname);
    console.log('닉네임을 로컬 스토리지에 저장했습니다:', gameManager.player.nickname);
  }
}

// 원래 GameManager의 handleLogin 함수를 오버라이드
const originalHandleLogin = gameManager.handleLogin;
gameManager.handleLogin = function() {
  console.log('로그인 처리를 시작합니다...');
  
  const nickname = this.elements.nicknameInput.value.trim();
  console.log('입력된 닉네임:', nickname);
  
  if (!nickname) {
    console.warn('닉네임이 비어있습니다.');
    this.showLoginError('닉네임을 입력하세요.');
    return;
  }
  
  if (nickname.length < 1 || nickname.length > 8) {
    console.warn('닉네임 길이가 유효하지 않습니다:', nickname.length);
    this.showLoginError('닉네임은 1~8자 사이로 입력하세요.');
    return;
  }
  
  // 사용자 정보 설정
  this.player.nickname = nickname;
  console.log('플레이어 닉네임 설정:', nickname);
  
  // 소켓이 연결되어 있는지 확인
  if (!socketManager.socket || !socketManager.socket.connected) {
    console.error('소켓이 연결되어 있지 않습니다.');
    this.showLoginError('서버 연결이 끊어졌습니다. 페이지를 새로고침해주세요.');
    return;
  }
  
  // 로비 입장
  console.log('join_lobby 이벤트 발송:', nickname);
  socketManager.emit('join_lobby', nickname);
  
  // 소켓 ID를 플레이어 ID로 설정
  setPlayerId(socketManager.socket.id);
  
  // 로그인 화면 숨기고 로비 화면 보이기
  console.log('로비 화면으로 전환합니다...');
  this.showScreen('lobby');
  console.log('로비 화면 전환 완료');
};

// 브라우저 새로고침 또는 종료 시 경고
window.addEventListener('beforeunload', function(e) {
  if (gameManager.gameStarted) {
    const message = '게임이 진행 중입니다. 페이지를 떠나면 게임에서 퇴장됩니다.';
    e.returnValue = message;
    return message;
  }
});