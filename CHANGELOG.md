# Legion Hook - Version History

## [v1.0.0] - 2026-04-05

### 🎉 Initial Release

#### Core Engine
- **Reverse Execution Engine** - Generate code from desired output
- **Modular Architecture** - Dynamic module registration and composition
- **Confined I/O System** - All operations logged and restricted to hook directory
- **Kernel Runtime** - Bootstrap injection and session management

#### Built-in Modules
- `print-success` - Handles `print("成功")` pattern
- `reverse-analyzer` - Analyzes output and generates execution plans
- `io-logger` - Audit trail for all I/O operations
- `context-guardian` - **NEW** Prevent context window overflow

#### Context Guardian Features
- Real-time token usage monitoring (80% warning, 90% auto-cleanup)
- Three compression strategies:
  - **Prune**: Remove oldest messages
  - **Summarize**: Generate conversation summary
  - **Compress**: Truncate tool call results
- Multi-model support (Qwen3.5-397B, Qwen3.5-35B, default)
- Automatic intervention before overflow
- Detailed logging and statistics

#### Security
- Path traversal prevention
- I/O confinement enforcement
- Operation audit logging (daily JSONL)
- Module validation on registration

#### Documentation
- README.md (Traditional Chinese + English)
- HOOK.md (Hook metadata)
- AUDIT.md (Self-audit report)
- CONTEXT-GUARDIAN.md (Module documentation)
- CHANGELOG.md (This file)

### Technical Details
- **TypeScript** implementation
- **OpenClaw Hook** compatible
- **MIT License**
- **16 files**, ~45KB total

---

## [Unreleased]

### v1.1.0 - Security Enhancement
- [x] Secret-Shield module for sensitive data protection
- [ ] Module marketplace integration
- [ ] Community module registry
- [ ] Dependency management

---

## [v1.0.0] - 2026-04-05

### v1.2.0 - Advanced Context Management
- [ ] Custom summarization models
- [ ] User preference learning
- [ ] Multi-session aggregation
- [ ] Web UI for monitoring

### v1.3.0 - Performance Optimization
- [ ] Caching layer for token estimation
- [ ] Lazy loading for large modules
- [ ] Parallel execution support
- [ ] Memory profiling tools

### v2.0.0 - Enterprise Features
- [ ] Team collaboration modules
- [ ] Audit compliance reporting
- [ ] Role-based access control
- [ ] Cloud sync for state

---

## Versioning Scheme

Legion Hook follows [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., 1.0.0)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Types

| Type | Version | Description |
|------|---------|-------------|
| Alpha | `x.0.0-alpha.y` | Early testing, unstable |
| Beta | `x.0.0-beta.y` | Feature complete, testing |
| RC | `x.0.0-rc.y` | Release candidate, stable |
| Stable | `x.y.z` | Production ready |

---

## Upgrade Guide

### From v0.x to v1.0.0

```bash
# 1. Backup current state
cp -r ~/.openclaw/workspace/hooks/legion/state ~/legion-backup

# 2. Update hook
cd ~/.openclaw/workspace/hooks/legion
git pull origin main

# 3. Restart Gateway
openclaw gateway restart

# 4. Verify
openclaw hooks list
```

### Configuration Changes

v1.0.0 introduces new configuration options in `context-guardian`:

```json
{
  "maxTokens": 262144,
  "warningThreshold": 0.7,
  "cleanupThreshold": 0.85,
  "keepRecentMessages": 20
}
```

---

## Support

- **GitHub Issues**: https://github.com/end8cl01g/Legion-hook/issues
- **Discord**: https://discord.gg/clawd
- **Documentation**: https://github.com/end8cl01g/Legion-hook/blob/main/README.md
