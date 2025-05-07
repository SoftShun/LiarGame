// 소켓 연결 관리 클래스
class SocketManager {
  constructor() {
    this.socket = null;
    this.events = {};
    this.isHost = false; // 방장 여부
    this.connectAttempts = 0; // 연결 시도 횟수
    this.maxConnectAttempts = 3; // 최대 연결 시도 횟수
    this.connected = false; // 연결 상태
    this.reconnecting = false; // 재연결 상태
  }

  // 서버에 연결
  connect() {
    console.log('소켓 연결 시도...');
    
    return new Promise((resolve, reject) => {
      try {
        // 연결 시도 횟수 증가
        this.connectAttempts++;
        console.log(`연결 시도 #${this.connectAttempts}/${this.maxConnectAttempts}`);
        
        // 이전 연결이 있으면 연결 해제
        if (this.socket) {
          console.log('이전 소켓 연결 해제');
          this.socket.disconnect();
          this.socket = null;
          this.connected = false;
        }
        
        // 현재 호스트에 연결
        this.socket = io({
          reconnection: true,        // 자동 재연결 활성화
          reconnectionAttempts: 3,   // 최대 재연결 시도 횟수
          reconnectionDelay: 1000,   // 재연결 간격 (ms)
          timeout: 5000,             // 연결 타임아웃 (ms)
          transports: ['websocket', 'polling'] // 웹소켓 우선, 폴링 차선
        });
        
        // 연결 이벤트 리스너
        this.socket.on('connect', () => {
          console.log('서버에 연결되었습니다. 소켓 ID:', this.socket.id);
          this.connectAttempts = 0; // 연결 성공 시 시도 횟수 초기화
          this.connected = true;
          this.reconnecting = false;
          
          // 기본 이벤트 리스너 설정
          this.setupBaseListeners();
          
          // 재연결 시 추가 처리
          if (this.reconnecting) {
            console.log('재연결에 성공했습니다. 게임 상태 동기화를 요청합니다.');
            this.emit('sync_game_state'); // 게임 상태 동기화 요청 (서버에서 처리해야 함)
          }
          
          resolve();
        });
        
        // 연결 전 이벤트
        this.socket.on('connecting', () => {
          console.log('서버에 연결 중...');
        });
        
        // 연결 오류 이벤트 리스너
        this.socket.on('connect_error', (error) => {
          console.error('서버 연결 오류:', error.message);
          this.connected = false;
          
          if (this.connectAttempts >= this.maxConnectAttempts) {
            console.error('최대 연결 시도 횟수 초과');
            reject(new Error('서버 연결에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.'));
          } else {
            console.log(`재연결 시도 중... (${this.connectAttempts}/${this.maxConnectAttempts})`);
          }
        });
        
        // 연결 시간 초과 이벤트
        this.socket.on('connect_timeout', () => {
          console.error('서버 연결 시간 초과');
          this.connected = false;
          
          if (this.connectAttempts >= this.maxConnectAttempts) {
            reject(new Error('서버 연결 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요.'));
          }
        });
      } catch (error) {
        console.error('소켓 연결 오류:', error);
        this.connected = false;
        reject(error);
      }
    });
  }

  // 기본 이벤트 리스너 설정
  setupBaseListeners() {
    if (!this.socket) {
      console.error('setupBaseListeners: 소켓이 초기화되지 않았습니다.');
      return;
    }
    
    console.log('기본 이벤트 리스너 설정...');
    
    // 연결 해제
    this.socket.on('disconnect', (reason) => {
      console.log('서버와 연결이 끊어졌습니다. 이유:', reason);
      this.connected = false;
      
      // 서버에서 강제로 연결을 끊었을 때는 재연결 시도하지 않음
      if (reason === 'io server disconnect') {
        console.log('서버에서 연결을 종료했습니다. 재연결하지 않습니다.');
      } else {
        this.reconnecting = true;
      }
      
      // 연결 끊김 알림
      this.triggerEvent('connection_lost', { reason });
    });
    
    // 재연결 시도
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`재연결 시도 중... (${attemptNumber}번째)`);
      this.reconnecting = true;
    });
    
    // 재연결 오류
    this.socket.on('reconnect_error', (error) => {
      console.error('재연결 오류:', error.message);
    });
    
    // 재연결 실패
    this.socket.on('reconnect_failed', () => {
      console.error('재연결 실패. 최대 시도 횟수 초과');
      this.connected = false;
      this.reconnecting = false;
      this.triggerEvent('reconnect_failed');
      alert('서버 연결이 끊어졌습니다. 페이지를 새로고침해주세요.');
    });
    
    // 재연결 성공
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`재연결 성공 (${attemptNumber}번째 시도)`);
      this.connected = true;
      this.reconnecting = false;
      this.triggerEvent('reconnected');
    });
    
    // 에러 처리
    this.socket.on('error', (error) => {
      console.error('소켓 오류:', error);
      this.triggerEvent('socket_error', { error });
    });
    
    // 게임 오류 처리
    this.socket.on('game_error', (message) => {
      console.error('게임 오류:', message);
      alert(`게임 오류: ${message}`);
      this.triggerEvent('game_error', { message });
    });
    
    // 플레이어 정보 처리 (방장 여부 등)
    this.socket.on('player_info', (data) => {
      this.isHost = data.isHost;
      console.log(`플레이어 정보: ID=${data.id}, 닉네임=${data.nickname}, 방장=${data.isHost}`);
      
      // 커스텀 이벤트 발생
      this.triggerEvent('player_info_updated', data);
    });
    
    // 방장 변경 처리
    this.socket.on('host_changed', (data) => {
      this.isHost = (data.hostId === this.socket.id);
      console.log(`방장 변경: ${data.nickname} (본인: ${this.isHost})`);
      
      // 커스텀 이벤트 발생
      this.triggerEvent('host_changed', data);
    });

    // 게임 모드 변경 처리
    this.socket.on('mode_update', (data) => {
      console.log('게임 모드 업데이트:', data);
      
      // mode_changed 이벤트를 emit하여 여러 클라이언트에 동기화
      if (this.isHost) {
        console.log('방장이 게임 모드를 변경했습니다:', data);
      } else {
        console.log('방장이 게임 모드를 다음으로 변경했습니다:', data.mode);
      }
      
      // 커스텀 이벤트 발생
      this.triggerEvent('mode_update', data);
    });
    
    console.log('기본 이벤트 리스너 설정 완료');
  }

  // 이벤트 리스너 등록
  on(event, callback) {
    if (!this.socket) {
      console.error(`on(${event}): 소켓이 연결되지 않았습니다.`);
      // 이벤트 대기열에 추가 (연결 후 등록하기 위해)
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(callback);
      return;
    }
    
    // 소켓 이벤트 등록
    console.log(`이벤트 리스너 등록: ${event}`);
    this.socket.on(event, callback);
    
    // 이벤트 저장
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  // 이벤트 emit
  emit(event, data) {
    if (!this.socket) {
      console.error(`emit(${event}): 소켓이 연결되지 않았습니다.`);
      return false;
    }
    
    if (!this.connected) {
      console.warn(`emit(${event}): 소켓이 연결되어 있지 않은 상태에서 이벤트 발송을 시도합니다.`);
    }
    
    console.log(`이벤트 발송: ${event}`, data);
    this.socket.emit(event, data);
    return true;
  }

  // 커스텀 이벤트 발생시키기
  triggerEvent(event, data) {
    console.log(`커스텀 이벤트 발생: ${event}`, data);
    
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`이벤트 처리 중 오류(${event}):`, error);
        }
      });
    }
  }

  // 특정 이벤트 리스너 제거
  off(event, callback) {
    if (!this.socket) {
      console.error(`off(${event}): 소켓이 연결되지 않았습니다.`);
      
      // 이벤트 목록에서 제거
      if (this.events[event] && callback) {
        this.events[event] = this.events[event].filter(cb => cb !== callback);
      } else if (this.events[event]) {
        delete this.events[event];
      }
      
      return;
    }
    
    console.log(`이벤트 리스너 제거: ${event}`);
    
    if (callback) {
      this.socket.off(event, callback);
      
      // 이벤트 목록에서 특정 콜백 제거
      if (this.events[event]) {
        this.events[event] = this.events[event].filter(cb => cb !== callback);
      }
    } else {
      this.socket.off(event);
      
      // 이벤트 목록에서 이벤트 제거
      delete this.events[event];
    }
  }

  // 모든 이벤트 리스너 제거
  offAll() {
    if (!this.socket) {
      console.error('offAll: 소켓이 연결되지 않았습니다.');
      this.events = {};
      return;
    }
    
    console.log('모든 이벤트 리스너 제거');
    
    // 등록된 모든 이벤트 제거
    Object.keys(this.events).forEach(event => {
      this.socket.off(event);
    });
    
    this.events = {};
  }

  // 연결 해제
  disconnect() {
    if (!this.socket) {
      console.error('disconnect: 소켓이 연결되지 않았습니다.');
      return;
    }
    
    console.log('소켓 연결 해제');
    this.socket.disconnect();
    this.connected = false;
  }
  
  // 연결 상태 확인
  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }
  
  // 소켓 ID 반환
  getSocketId() {
    return this.socket ? this.socket.id : null;
  }
}

// 싱글톤 인스턴스 생성
const socketManager = new SocketManager();