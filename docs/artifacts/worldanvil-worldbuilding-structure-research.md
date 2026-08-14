# WorldAnvil Structure Research For Setting Codex

Status: reference research. This document records how official WorldAnvil documentation influenced the repo's local worldbuilding structure. It does not create setting canon by itself.

## Sources Checked

- [How to Use Article Templates](https://www.worldanvil.com/learn/article-guides/article-templates)
- [Article Template Guides](https://www.worldanvil.com/learn/article-templates)
- [Lesson 1: Get Started with Articles](https://www.worldanvil.com/learn/beginner-tutorials/get-started-articles)
- [Feature Guide to Categories](https://www.worldanvil.com/learn/categories/categories-guide)
- [World Anvil Learn](https://www.worldanvil.com/learn)

## Useful Structure

WorldAnvil treats a "world" as a whole setting project and encourages articles for characters, places, items, organizations, spells, and related setting subjects. It also treats maps and timelines as connected worldbuilding tools, rather than isolated images or date lists.

Article templates are the main unit of authored lore. The official template guide lists broad article types that map well to this game: Character, Document, Ethnicity, Item, Language, Material, Conflict, Myth, Building, Geography, Settlement, Natural Law, Organization, Species, Spell, Technology, Tradition, Vehicle, Prose, and Plot. It also notes that templates share introductions, prompts, layout tools, relations, and linking fields.

The template guide is especially useful for taxonomy:

- Nations, religions, guilds, pantheons, companies, families, and raid parties map to **Organization**.
- Magic systems map to **Natural Law**; specific manifestations map to **Spell** or game-content mechanics elsewhere.
- Cultures and subcultures map to **Ethnicity**.
- Short stories and scenes map to **Prose**.
- Myths, legends, urban legends, and prophecies map to **Myth**.
- Built places map to **Building** or **Settlement**; natural regions map to **Geography**.
- Technologies describe systems, while Items describe specific objects that use those systems.

Categories are the table-of-contents layer. WorldAnvil's category guide states that categories contain articles and make up the world's table of contents. It also recommends small categories and subcategories as a category grows.

WorldAnvil's Learn page also emphasizes features useful for this repo's long-term lore work: Timelines for history, Chronicles for map-linked history, Calendars for festivals and dates, Secrets for hidden information, Interactive Tables for structured lists, Content Trees for hierarchies, Variables for repeated terms, and Random Generators for names or article seeds.

## Local Repo Translation

This repo will not try to clone WorldAnvil. Instead, `docs/content/world/` uses the same mental model:

- `README.md`: world index, category tree, article-type rules, and reading order.
- `world-history.md`: timeline-style history, eras, and historical conflicts.
- `gazetteer.md`: geography, settlements, nations, regions, and travel logic.
- `lore-dictionary.md`: glossary-style entries for magic, law, technology, materials, institutions, titles, and recurring terms.
- `myths-and-stories.md`: myths, legends, in-world documents, and readable story seeds.

The docs should stay cross-linkable, template-minded, and compact enough to grow. Large categories should split when they approach roughly thirty substantial entries.

## Design Constraint

The setting codex guides fiction, art, card naming, encounter theming, and onboarding flavor. It does not override `EncounterEngine`, card resources, ADRs, or rules docs.
