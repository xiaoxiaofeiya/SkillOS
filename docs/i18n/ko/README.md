# SkillOS 한국어

**설치한 스킬을 AI 코딩 에이전트가 제때 꺼내 쓰게 만드는 로컬 지휘 센터입니다.**

요즘 코딩 에이전트는 코드 작성만 하지 않습니다. UI를 다듬고, 브라우저에서 테스트하고, 배포하고, 보안을 검토하고, 문서를 읽고, CLI를 만들고, 노트북을 실행하고, MCP 도구를 호출할 수 있습니다.

문제는 능력이 많아질수록 에이전트가 어떤 능력을 언제 써야 하는지 놓치기 쉽다는 것입니다.

SkillOS는 이 문제를 해결합니다.

## SkillOS가 하는 일

SkillOS는 에이전트가 다음을 판단하도록 돕습니다.

- 이 컴퓨터에 어떤 스킬과 도구가 설치되어 있는지.
- 각 능력이 어떤 작업에 적합한지.
- 사용자의 애매한 요청이 실제로 어떤 작업인지.
- 지금 사용할 스킬은 무엇인지.
- 나중 단계에서 사용할 스킬은 무엇인지.
- 위험한 작업은 승인이나 차단이 필요한지.
- 완료 전에 어떤 검증을 해야 하는지.

## 예시

사용자가 이렇게 말합니다.

```text
UI 디자인을 잘 모르겠어. 이 화면을 제품처럼 보이게 고치고 확인해 줘.
```

SkillOS는 이 요청을 단순한 색상 변경이 아니라 하나의 작업 흐름으로 보게 합니다.

```text
제품 목적 이해
  -> 레이아웃 계획
  -> UI 구현
  -> 브라우저 검증
  -> 스크린샷 QA
  -> 깨짐과 넘침 수정
  -> 결과 설명
```

사용자는 `playwright`나 `screenshot` 같은 이름을 몰라도 됩니다.

## 누구에게 필요한가

- 스킬 이름을 모르지만 에이전트를 잘 쓰고 싶은 사용자.
- 많은 skills를 설치해 두고 자동 라우팅을 원하는 개발자.
- Codex, Claude Code, Cursor, Windsurf, OpenHands, OpenClaw를 함께 쓰는 팀.
- 자신의 skill을 더 잘 발견되게 만들고 싶은 제작자.
- MCP, 로컬 로그, 안전 모드, 평가가 필요한 agent 개발자.

## 시작하기

Agent-facing skill 설치:

```bash
npx skills add xiaoxiaofeiya/SkillOS -g
```

로컬 runtime 설치:

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.sh | bash
```

Windows:

```powershell
irm https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.ps1 | iex
```

그 다음:

```bash
skillos doctor
skillos setup --safety approve
skillos recommend "Make this UI professional and verify it"
skillos explain --last
```

자세한 내용은 [Product Overview](../../product-overview.md)와 [Installation](../../installation.md)를 참고하세요.
