---
description: Add a fixed liturgical celebration (optionally regional)
argument-hint: <MM-DD> <rank> <color> <English title> | <Vietnamese title> [region]
---
Add a fixed celebration to `FIXED` in `src/shared/liturgical/liturgical.ts` using: $ARGUMENTS

- Use an existing rank (`solemnity|feast|memorial|optional_memorial`) and colour (`white|red|green|violet|rose`).
- Use a stable snake_case `key`. If regional, pass the region array (`['CA']`, `['US']`, `['VN']`). If it's a feast of the Lord, set the `lordFeast` flag.
- Add a test in `tests/liturgical.test.ts` asserting the principal celebration on a year where it does not collide, and one where it is impeded by a Sunday (memorial/feast should be omitted; solemnity should transfer).
- Run `npm test`.
