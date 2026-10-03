# Project working rules

- Do not add assistant, model, tool-brand, or generation-source attribution to user-facing or shareable material. This includes UI copy, documents, reports, filenames, branches, commits, and pull requests. Use neutral business names.
- Before continuing development in this repository, read `/Users/yitianwu/.config/development/pr-workflow.md` and keep the user's open work in one pull request. Preserve Git history and existing evidence.
- Public temporary mail remains available by address alone. The app does not automatically clear local history. Binary attachment caching is limited to 10 MiB per file and 100 MiB in total; browser storage pressure or clearing site data can remove local copies. Preserve the current permission and attachment boundaries.

## UI design specialists

Read the matching skill before work. A request may need more than one, in this order when the work spans the whole interface:

| Task | Skill |
| --- | --- |
| User journeys, navigation, screen states, information hierarchy | `.agents/skills/map-mail-experience/SKILL.md` |
| Visual direction, tokens, components, themes, responsive and right-to-left rules | `.agents/skills/shape-mail-design-system/SKILL.md` |
| Vue and Element Plus implementation | `.agents/skills/build-mail-interface/SKILL.md` |
| Independent UI acceptance and regression review | `.agents/skills/review-mail-interface/SKILL.md` |

Each specialist should produce the artifact or evidence described in its skill, and state what it did not verify. For whole-interface work, experience research and the current-state audit can run in parallel. Settle the screen and visual design before implementation, then have an independent reviewer check the rendered result. Keep file ownership explicit so parallel edits do not collide.
