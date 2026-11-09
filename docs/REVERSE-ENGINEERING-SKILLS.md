# GitHub-скиллы для обратного реинжиниринга проектов: что есть и что из этого брать

Дата проверки: **2026-11-09**. Данные — GitHub API (звёзды, лицензия, дата последнего пуша), README/SKILL.md там, где они читались.

---

## 1. Сначала о терминах: «reverse engineering» — это два разных занятия

| Что называют RE | Что это на практике | Подходит ли к этому репозиторию |
|---|---|---|
| Бинарный/мобильный RE | Ghidra, Frida, дизассемблирование, CTF, малварь | **Нет.** Здесь TypeScript-исходники, ничего дизассемблировать не нужно |
| RE кодовой базы (code archaeology) | восстановить архитектуру, доменные правила, инварианты и решения по существующему исходнику; получить PRD/CLAUDE.md/ADR | **Да.** Именно это нужно для «создания контекста» |

Большинство «reverse engineering skills» на GitHub — про первое. Для второго корректный запрос: *codebase analysis*, *code archaeology*, *documentation bootstrap*, *context engineering*, *legacy modernization*.

---

## 2. Шорт-лист (проверено по API)

### 2.1 Прямо в цель: анализ существующего кода → документация/контекст

| Репозиторий | ★ | Лицензия | Пуш | Что реально даёт |
|---|---:|---|---|---|
| [Ycsyyds/codebase-analysis-skill](https://github.com/Ycsyyds/codebase-analysis-skill) | 41 | MIT | 2026-03-27 | Claude Code skill: 9 фаз (0–7 + 1.5), требование `[VERIFY: file:line]` к каждому утверждению, скрипты пост-проверки ссылок, шаблоны и примеры. Самый зрелый из «маленьких» именно под нашу задачу |
| [emmaisasleep/project-rebirth-skill](https://github.com/emmaisasleep/project-rebirth-skill) | 0 | — | — | 4 фазы: уточнение, анализ (4 скрипта: структура, намерения, «трение», потоки данных), генерация Rebirth Kit (`PRD.md`, `CLAUDE.md`, `standards.yaml`), ревью. Концептуально ровно «обратный реинжиниринг проекта в контекст», но без подтверждения сообществом |
| [longranger2/project-doc-bootstrap](https://github.com/longranger2/project-doc-bootstrap) | 2 | MIT | 2026-04-19 | Фрактальная иерархия документации: L1 корневой `CLAUDE.md`, L2 по каталогам, L3 заметки в файлах; `AGENTS.md` как симлинк. Полезно, чтобы контекст не сгнил через месяц |
| [YaojieZhang/Repo-Analyzer-Skills](https://github.com/YaojieZhang/Repo-Analyzer-Skills) | 3 | нет | 2026-03-09 | Python-тулкит (`analyze_repo.py`, `src`, `tests`) для быстрого разбора крупных репозиториев. Больше про метрики, чем про смысл |
| [juanje/context-generator](https://github.com/juanje/context-generator) | 4 | MIT | 2026-06-22 | Генерирует и поддерживает компактные context-файлы для ревьюеров/LLM. Узко, но честно |

### 2.2 Полезные «соседние» наборы

| Репозиторий | ★ | Лицензия | Что взять конкретно |
|---|---:|---|---|
| [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit) | 2 655 | MIT | `c4-architecture` (диаграммы C4), `backend-to-frontend-handoff-docs`, `qa-test-planner` (план тестов под текущие дыры), `react-dev`, `react-useeffect`, `reducing-entropy`, `session-handoff`, `skill-judge` |
| [anthropics/skills](https://github.com/anthropics/skills) | 190 247 | нет файла лицензии | Официальный набор: `webapp-testing` (Playwright-тесты — прямое лекарство от отсутствия e2e), `skill-creator`, `frontend-design`, `doc-coauthoring`, `xlsx` |
| [obra/superpowers](https://github.com/obra/superpowers) | 314 859 | MIT | Методология, а не анализ: `brainstorming`, `writing-plans`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`. Полезно как процесс, не как анализатор |
| [markdown-viewer/skills](https://github.com/markdown-viewer/skills) | 3 397 | CC-BY-4.0 | Диаграммы (в т.ч. архитектурные) прямо в Markdown — удобно для этого документа |
| [alexgaoth/awesome-reverse-engineered](https://github.com/alexgaoth/awesome-reverse-engineered) | 1 294 | MIT | Каталог «что уже отреверсили» — справочник, не скилл |

### 2.3 Что НЕ подходит, хотя по названию кажется «тем самым»

- [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills) (3 665★) — web/pwn/crypto/forensics/RE для CTF. Бинарный RE, к TS-репозиторию неприменим.
- `index-login/MobileRE-Skill`, `1llu50ry/mcp-reverse`, `cellebrite-labs/ghidra-rpc` — мобильный/бинарный RE, Ghidra, Frida.
- `zhaoxuya520/reverse-skill` — «reverse engineering / pentest router», безопасность, а не документация кода.

---

## 3. Критическая оценка скиллов (а не только списка)

1. **Скилл — это промпт-каркас, не анализатор.** Ни один из них не парсит AST и не доказывает утверждения; ценность — в дисциплине (фазы, обязательные ссылки `file:line`, чек-листы). Всё содержательное всё равно добывается чтением кода и запуском тестов.
2. **Звёзды ≠ качество.** `project-rebirth-skill` (0★) концептуально ближе к задаче, чем `ctf-skills` (3.6k★); у `codebase-analysis-skill` всего 41★, но есть методика и скрипты верификации. Звёзды у `obra/superpowers` (314k) и `anthropics/skills` (190k) — популярность, а не пригодность к RE.
3. **Лицензии разные:** у `anthropics/skills` и `Repo-Analyzer-Skills` файла лицензии нет — для внутреннего использования уточняйте у правообладателя; `markdown-viewer/skills` — CC-BY-4.0 (нужна атрибуция).
4. **Расхождение в README у `codebase-analysis-skill`:** инструкция по установке ссылается на `github.com/Yangchengshuai/...` (старое имя/форк), а репозиторий живёт под `Ycsyyds`. Перед установкой проверяйте, что клонируете именно то, что читали.
5. **Риск «уверенной чуши».** Скиллы генерят красивые документы; без требования `[VERIFY: file:line]` и без прогона кода в них появляются несуществующие функции и «архитектурные решения», которых не было. В моём документе каждая претензия сопровождается ссылкой и воспроизведением — это и есть разница между RE и пересказом.
6. **Установка = исполнение чужого кода.** Большинство скиллов предлагают клонирование в `~/.claude/skills` или плагин-маркетплейс; читайте `SKILL.md`, `scripts/`, `helpers/` до запуска, особенно если скилл включает shell/python-шаги.
7. **Для 2,3 тыс. строк скилл — оверхед.** Этот проект целиком читается за один проход (2 498 строк, включая тесты). Скилл дал бы шаблон отчёта и чек-лист полноты, но не новые факты.

---

## 4. Как я бы применил это к данному репозиторию (и что уже сделано)

| Шаг | Инструмент | Результат |
|---|---|---|
| 1. Инвентаризация: размеры, зависимости, точки входа, git-история | вручную + `git`/`npm` | раздел 4–5 в `PROJECT-CONTEXT.md`; найдено, что `main` и ветка — несвязанные истории |
| 2. Карта модулей и потоков данных | `c4-architecture` (по желанию) | разделы 5–6 |
| 3. Извлечение доменных правил и инвариантов | `codebase-analysis-skill` (фазы 2–4) | разделы 6–7, формулы и 6 инвариантов |
| 4. **Верификация**: запуск `tsc`, тестов, сборки, инструментальные проверки гипотез | без скиллов, только код | раздел 9 с числами; так найдены KPI-расхождение, перевёрнутые периоды, `ReferenceError` |
| 5. Критика и приоритизация P0/P1/P2 | `qa-test-planner`, `systematic-debugging` | раздел 9 |
| 6. Фиксация контекста для следующих сессий | `project-doc-bootstrap` / `context-generator` | этот файл + `PROJECT-CONTEXT.md` (при желании — разбить на L2 по каталогам) |

Если хочется автоматизировать шаг 3 и 6: `Ycsyyds/codebase-analysis-skill` + `longranger2/project-doc-bootstrap`. Если цель — «переписать проект с нуля по PRD»: `emmaisasleep/project-rebirth-skill` (как шаблон, не как истина). Если цель — закрыть дыры в тестах и a11y: `anthropics/skills → webapp-testing` + `softaworks/agent-toolkit → qa-test-planner`.

---

## 5. Что я рекомендую не делать

- Не запускать скиллы «для галочки» и не принимать их выводы без проверки кодом — в этом репозитории цена ошибки высокая: неверно описанный инвариант (например, «факт не обрезается») приведёт к regression в финансовых числах.
- Не позволять скиллу переписывать код в рамках «анализа»: сначала документ и тесты, потом изменения.
- Не тащить бинарные RE-паки (CTF/Ghidra/Frida) — они не про этот класс задач.
- Не строить процесс на репозиториях с 0–4★ без собственного ревью `SKILL.md`; и наоборот, не игнорировать маленькие репозитории только из-за звёзд.

---

## 6. Итог в одну строку

Для «обратного реинжиниринга проекта» на GitHub есть рабочие, но молодые скиллы: **`Ycsyyds/codebase-analysis-skill`** (методика + верификация ссылок) и **`emmaisasleep/project-rebirth-skill`** (PRD/CLAUDE.md из легаси), плюс инфраструктурные **`softaworks/agent-toolkit`** и **`anthropics/skills`**. Они экономят структуру отчёта, но не заменяют чтение кода, запуск `tsc`/тестов и проверку чисел — именно последнее и вскрыло главные проблемы этого дашборда.
