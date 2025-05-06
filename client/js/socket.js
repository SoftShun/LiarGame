// 소켓 연결 관리 클래스
class SocketManager {
  constructor() {
    this.socket = null;
    this.events = {};
    this.isHost = false; // 방장 여부
  }

  // 서버에 연결
  connect() {
    return new Promise((resolve, reject) => {
      try {
        // 현재 호스트에 연결 (배포 시 수정 필요할 수 있음)
        this.socket = io();
        
        // 연결 이벤트 리스너
        this.socket.on('connect', () => {
          console.log('서버에 연결되었습니다.');
          resolve();
        });
        
        // 연결 오류 이벤트 리스너
        this.socket.on('connect_error', (error) => {
          console.error('서버 연결 오류:', error);
          reject(error);
        });
        
        // 기본 이벤트 리스너 설정
        this.setupBaseListeners();
      } catch (error) {
        console.error('소켓 연결 오류:', error);
        reject(error);
      }
    });
  }

  // 기본 이벤트 리스너 설정
  setupBaseListeners() {
    // 연결 해제
    this.socket.on('disconnect', () => {
      console.log('서버와 연결이 끊어졌습니다.');
    });
    
    // 에러 처리
    this.socket.on('error', (error) => {
      console.error('소켓 오류:', error);
    });
    
    // 게임 오류 처리
    this.socket.on('game_error', (message) => {
      console.error('게임 오류:', message);
      alert(message);
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
  }

  // 이벤트 리스너 등록
  on(event, callback) {
    if (!this.socket) {
      console.error('소켓이 연결되지 않았습니다.');
      return;
    }
    
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
      console.error('소켓이 연결되지 않았습니다.');
      return;
    }
    
    this.socket.emit(event, data);
  }

  // 커스텀 이벤트 발생시키기
  triggerEvent(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        callback(data);
      });
    }
  }

  // 특정 이벤트 리스너 제거
  off(event, callback) {
    if (!this.socket) {
      console.error('소켓이 연결되지 않았습니다.');
      return;
    }
    
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
      console.error('소켓이 연결되지 않았습니다.');
      return;
    }
    
    // 등록된 모든 이벤트 제거
    Object.keys(this.events).forEach(event => {
      this.socket.off(event);
    });
    
    this.events = {};
  }

  // 연결 해제
  disconnect() {
    if (!this.socket) {
      console.error('소켓이 연결되지 않았습니다.');
      return;
    }
    
    this.socket.disconnect();
  }
}

// 싱글톤 인스턴스 생성
const socketManager = new SocketManager();