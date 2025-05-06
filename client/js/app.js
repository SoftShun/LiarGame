// 애플리케이션 초기화 및 메인 로직
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // 로딩 화면 표시
    gameManager.showScreen('loading');
    
    // 소켓 연결
    await socketManager.connect();
    console.log('서버에 연결되었습니다.');
    
    // 소켓 이벤트 리스너 설정
    gameManager.setupSocketListeners();
    
    // 연결 성공 시 로그인 화면으로 이동
    gameManager.showScreen('login');
    
    // 로컬 스토리지에서 닉네임 불러오기 (이전에 사용한 닉네임이 있으면)
    const savedNickname = localStorage.getItem('liar-game-nickname');
    if (savedNickname) {
      document.getElementById('nickname-input').value = savedNickname;
    }
    
  } catch (error) {
    console.error('초기화 오류:', error);
    alert('서버 연결에 실패했습니다. 페이지를 새로고침하거나 나중에 다시 시도해주세요.');
  }
});

// 로그인 성공 시 플레이어 ID 저장 함수
function setPlayerId(id) {
  gameManager.player.id = id;
  
  // 닉네임 로컬 스토리지에 저장
  localStorage.setItem('liar-game-nickname', gameManager.player.nickname);
}

// 원래 GameManager의 handleLogin 함수를 오버라이드
const originalHandleLogin = gameManager.handleLogin;
gameManager.handleLogin = function() {
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
  
  // 소켓 ID를 플레이어 ID로 설정
  setPlayerId(socketManager.socket.id);
  
  // 로그인 화면 숨기고 로비 화면 보이기
  this.showScreen('lobby');
};

// 브라우저 새로고침 또는 종료 시 경고
window.addEventListener('beforeunload', function(e) {
  if (gameManager.gameStarted) {
    const message = '게임이 진행 중입니다. 페이지를 떠나면 게임에서 퇴장됩니다.';
    e.returnValue = message;
    return message;
  }
});