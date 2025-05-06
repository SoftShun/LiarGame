class Player {
  constructor(id, nickname) {
    this.id = id;           // 소켓 ID
    this.nickname = nickname; // 닉네임
    this.isLiar = false;    // 라이어 여부
    this.isSpy = false;     // 스파이 여부
    this.score = 0;         // 점수
    this.isSpectator = false; // 관전자 여부
  }
}

module.exports = Player;