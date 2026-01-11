# Link Validation Report (All Migration Docs)

Scope: validate that every Markdown file+line link of the form `[label](path#Lx)` / `[label](path#Lx-Ly)` in:
- [API_CONTRACT.md](API_CONTRACT.md)
- [BACKEND_STUB_PLAN.md](BACKEND_STUB_PLAN.md)
- [COUPLING_SCAN.md](COUPLING_SCAN.md)
- [BASE44_CALL_SURFACE_EXTRACT.md](BASE44_CALL_SURFACE_EXTRACT.md)
- [MIGRATION_EXECUTION_PLAN.md](MIGRATION_EXECUTION_PLAN.md)
- [DATA_MODEL.md](DATA_MODEL.md)
- [ENVIRONMENT.md](ENVIRONMENT.md)
- [LINK_VALIDATION_REPORT.md](LINK_VALIDATION_REPORT.md)

This report covers the full migration doc set. Each cited link must resolve to an existing file, an in-range line/range, and the cited line/range must contain the claimed code pattern/excerpt stated on the same doc line.

## Summary
 - Docs validated: **8**
 - Links checked: **964**
 - Remaining issues after fixes: **0**

## Fixes applied during earlier validation passes (before full 8-doc validation)
### 1) Stale anchor in BACKEND_STUB_PLAN
- Location: [BACKEND_STUB_PLAN.md](BACKEND_STUB_PLAN.md#L8)
- Change:
  - Old: `API_CONTRACT.md#L1`
  - New: `[API_CONTRACT.md](API_CONTRACT.md#L395)`
- Why: `#L1` points at the title line, not Appendix A. `#L395` points at the Appendix A header line containing the referenced pattern.

### 2) Ambiguous multi-link claims in API_CONTRACT (excerpt clarification)
These were not “broken links” (the targets existed), but the doc lines contained multiple links and multiple code claims; the evidence text was rewritten so each link has an adjacent excerpt that appears verbatim at the target location.

- Profile update call-site evidence split into two bullets:
  - [API_CONTRACT.md](API_CONTRACT.md#L30) — adds the exact `base44.auth.updateMe(data)` call-site excerpt.
  - [API_CONTRACT.md](API_CONTRACT.md#L31) — adds the exact `privacy_settings` default excerpt.

- `update(id, patch)` semantics line updated to include per-link excerpts:
  - [API_CONTRACT.md](API_CONTRACT.md#L52) — includes both:
    - ForumTopic update excerpt: `base44.entities.ForumTopic.update(topic.id, {`
    - Profile update excerpt: `mutationFn: (data) => base44.auth.updateMe(data),`

### 3) Stale anchors + wildcard excerpts in migration docs

**Anchor fixes (old → new)**

| Doc | Doc line | Old link | New link | Reason |
|---|---:|---|---|---|
| [MIGRATION_EXECUTION_PLAN.md](MIGRATION_EXECUTION_PLAN.md#L14) | 14 | `src/App.jsx#L1-L15` | `[src/App.jsx](src/App.jsx#L1-L14)` | Target file is 14 lines long. |
| [MIGRATION_EXECUTION_PLAN.md](MIGRATION_EXECUTION_PLAN.md#L16) | 16 | `src/pages/Layout.jsx#L1-L13` | `[src/pages/Layout.jsx](src/pages/Layout.jsx#L1-L12)` | Target file is 12 lines long. |
| [MIGRATION_EXECUTION_PLAN.md](MIGRATION_EXECUTION_PLAN.md#L22) | 22 | `src/api/base44Client.js#L1-L9` | `[src/api/base44Client.js](src/api/base44Client.js#L1-L8)` | Target file is 8 lines long. |
| [MIGRATION_EXECUTION_PLAN.md](MIGRATION_EXECUTION_PLAN.md#L50) | 50 | `src/api/base44Client.js#L1-L9` | `[src/api/base44Client.js](src/api/base44Client.js#L1-L8)` | Target file is 8 lines long. |
| [MIGRATION_EXECUTION_PLAN.md](MIGRATION_EXECUTION_PLAN.md#L128) | 128 | `src/api/base44Client.js#L1-L9` | `[src/api/base44Client.js](src/api/base44Client.js#L5-L8)` | Anchor updated to the exact `createClient` block and excerpt made verbatim. |
| [ENVIRONMENT.md](ENVIRONMENT.md#L20) | 20 | `src/api/base44Client.js#L1-L9` | `[src/api/base44Client.js](src/api/base44Client.js#L5-L8)` | Anchor updated to the exact `createClient` block and excerpt made verbatim. |

**Excerpt fixes (wildcards/ellipsis → verbatim code)**

These were not “broken links” (targets existed), but the inferred patterns (e.g. `base44.entities.*`, `...`) cannot appear verbatim in real code. The doc text was updated to use a real line excerpt at the linked anchor:

- [MIGRATION_EXECUTION_PLAN.md](MIGRATION_EXECUTION_PLAN.md#L206) — PSA-123 now cites the verbatim Leaderboard list call.
- [DATA_MODEL.md](DATA_MODEL.md#L17) — entity surface area line now cites a verbatim `export const Wrestler = base44.entities.Wrestler;` excerpt.
- [DATA_MODEL.md](DATA_MODEL.md#L22-L23) — `updateMe` and `User.list` examples now match the linked call-sites exactly.

## How validation was performed
A small deterministic validator was run locally (no repo code changes) that:
1. Extracts all Markdown links in the docs that include a `#L` anchor.
2. Confirms the target file exists and the referenced line/range is in bounds.
3. Infers the “claimed pattern” from the same doc line (preferring code excerpts after an em dash `—`, else code-like inline backticks), then checks it appears in the target line/range.

Re-run command (from repo root):

```bash
python3 -c $'import re\nfrom pathlib import Path\n\nDOCS=[\n  "API_CONTRACT.md",\n  "BACKEND_STUB_PLAN.md",\n  "COUPLING_SCAN.md",\n  "BASE44_CALL_SURFACE_EXTRACT.md",\n  "MIGRATION_EXECUTION_PLAN.md",\n  "DATA_MODEL.md",\n  "ENVIRONMENT.md",\n  "LINK_VALIDATION_REPORT.md",\n]\nROOT=Path(".")\nlink_re=re.compile(r"\\[[^\\]]*\\]\\((?!https?://)([^)#\\s]+)#L(\\d+)(?:-L(\\d+))?\\)")\ncode_re=re.compile(r"`([^`]+)`")\nCODEY_HINTS=("base44.","setInterval","setTimeout","refetchInterval","import ",".@/api/functions","../.@/api/functions","entities.","auth.","integrations.")\n\ndef norm(s):\n  s=s.strip()\n  if s.startswith("`") and s.endswith("`"): s=s[1:-1]\n  s=s.strip().rstrip(");,")\n  s=re.sub(r"\\s+"," ",s)\n  return s\n\ndef looks_codey(s):\n  s=s.strip()\n  return any(h in s for h in CODEY_HINTS)\n\ndef infer_expected(line):\n  if "—" in line:\n    rhs=line.split("—",1)[1]\n    codes=[c for c in code_re.findall(rhs) if looks_codey(c)]\n    if codes: return [norm(c) for c in codes]\n    if ".@/api/functions" in rhs or "../.@/api/functions" in rhs: return [".@/api/functions","../.@/api/functions"]\n    m=re.search(r"(base44\\.[A-Za-z0-9_\\.]+)",rhs)\n    if m: return [norm(m.group(1))]\n  codes=[c for c in code_re.findall(line) if looks_codey(c)]\n  if codes: return [norm(codes[0])]\n  m=re.search(r"(base44\\.[A-Za-z0-9_\\.]+)",line)\n  if m: return [norm(m.group(1))]\n  return []\n\nissues=[]\nlinks=0\nfor doc in DOCS:\n  p=ROOT/doc\n  lines=p.read_text(encoding="utf-8").splitlines()\n  for ln_no, line in enumerate(lines, start=1):\n    for m in link_re.finditer(line):\n      links+=1\n      rel=m.group(1); start=int(m.group(2)); end=int(m.group(3) or m.group(2))\n      target=ROOT/rel\n      if not target.exists():\n        issues.append((doc,ln_no,rel,start,end,"missing file")); continue\n      flines=target.read_text(encoding="utf-8", errors="replace").splitlines()\n      if start<1 or end<start or end>len(flines):\n        issues.append((doc,ln_no,rel,start,end,f"out of range max={len(flines)}")); continue\n      expected=infer_expected(line)\n      if not expected: continue\n      snippet="\\n".join(flines[start-1:end])\n      sn=norm(snippet)\n      if any(norm(e) in sn for e in expected):\n        continue\n      issues.append((doc,ln_no,rel,start,end,f"pattern mismatch expected={expected} got={flines[start-1].strip()}"))\n\nprint("links_checked", links)\nprint("issues", len(issues))\nif issues: print("sample", issues[:10])\n'
```

## Final Validation (Authoritative)

Validated documents:
- API_CONTRACT.md
- BACKEND_STUB_PLAN.md
- COUPLING_SCAN.md
- BASE44_CALL_SURFACE_EXTRACT.md
- MIGRATION_EXECUTION_PLAN.md
- DATA_MODEL.md
- ENVIRONMENT.md
- LINK_VALIDATION_REPORT.md

Results:
- Links checked: 964
- Issues: 0
