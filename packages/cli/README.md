# @skillos/cli

Command-line interface for SkillOS.

Preview install after npm publish:

```bash
npm install -g @skillos/cli@preview
```

Common commands:

```bash
skillos setup --safety approve
skillos inventory
skillos recommend "Make this UI professional and verify it"
skillos explain --last
skillos feedback --decision <id> --prefer playwright
skillos eval run
skillos pack verify
```

Use `--format json` for stable machine-readable output.
