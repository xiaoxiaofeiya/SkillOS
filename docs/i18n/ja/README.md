# SkillOS 日本語

**インストールしたスキルを、AI コーディングエージェントが本当に使える力に変えるための司令塔です。**

AI エージェントは、コード作成、UI 改善、ブラウザ検証、デプロイ、安全レビュー、ドキュメント調査、ノートブック作業、MCP ツール呼び出しなど、さまざまなことができるようになっています。

しかし、能力が増えるほど問題も増えます。エージェントは、どのスキルをいつ使えばよいのかを見落とすことがあります。

SkillOS はそのためのローカル優先のオーケストレーション層です。

## 何をするものか

SkillOS は、エージェントに次の判断を助けます。

- このマシンにどんなスキルが入っているか。
- それぞれのスキルが何に向いているか。
- ユーザーの曖昧な依頼が本当はどんな作業なのか。
- 今使うべきスキルはどれか。
- 後で使うべきスキルはどれか。
- 危険な操作には確認が必要か。
- 完了前にどんな検証をすべきか。

## 例

ユーザーがこう言ったとします。

```text
UI デザインが分からない。このダッシュボードをプロっぽくして、ちゃんと確認して。
```

SkillOS は、これを単なる色変更ではなく、次のような流れとして扱えるようにします。

```text
画面の目的を理解
  -> レイアウトを考える
  -> 実装する
  -> ブラウザで確認する
  -> スクリーンショットで検査する
  -> 崩れやはみ出しを直す
  -> 変更内容を説明する
```

ユーザーが `playwright` や `screenshot` という名前を知っている必要はありません。

## 誰のためか

- スキル名を覚えたくないユーザー。
- 多くの agent skills をインストールしている開発者。
- Codex、Claude Code、Cursor、Windsurf、OpenHands、OpenClaw をまたいで使うチーム。
- 自分のスキルを見つけてもらいやすくしたい skill 作者。
- MCP、ローカルログ、安全モード、評価を必要とする agent 開発者。

## 始め方

Agent-facing skill をインストールします。

```bash
npx skills add xiaoxiaofeiya/SkillOS -g
```

ローカル runtime をインストールします。

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.sh | bash
```

Windows では次を使えます。

```powershell
irm https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.ps1 | iex
```

その後：

```bash
skillos doctor
skillos setup --safety approve
skillos recommend "Make this UI professional and verify it"
skillos explain --last
```

詳しくは [Product Overview](../../product-overview.md) と [Installation](../../installation.md) を読んでください。
