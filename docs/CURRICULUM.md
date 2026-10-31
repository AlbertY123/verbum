# Verbum curriculum

Verbum contains **600 authored vocabulary entries**, organised into six strands of 100:

| Strand                | Writing purpose                                                                    |
| --------------------- | ---------------------------------------------------------------------------------- |
| Analytical verbs      | Explain what a text does and match the strength of a claim to its evidence.        |
| Argument & persuasion | Discuss contention, reasoning, evidence, appeals and audience positioning.         |
| Tone & attitude       | Describe a particular attitude and support it with language choices.               |
| Themes & ideas        | Develop precise interpretations of identity, relationships, power and values.      |
| Character & society   | Describe motives, ethical conduct and social structures without vague judgement.   |
| Literary craft        | Explain how narrative form, perspective, structure and language construct meaning. |

The curriculum primarily supports **VCE mainstream English**, with Australian spelling. Foundation, Developing and Advanced are Verbum's editorial difficulty labels; they are not official year-level standards. The selection includes familiar analytical anchors alongside less familiar vocabulary. It is not a measured list of words that every student does or does not know.

## Curriculum basis

The design responds to the VCAA's emphasis on analysing how ideas, vocabulary, language features and structures make meaning, and how argument and language seek to influence audiences. These are the reasons Verbum combines word meanings with contextual use rather than teaching an isolated thesaurus. See the VCAA's [English and EAL assessment guidance](https://www.vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/english-and-english-additional-language/assessment).

The VCAA's [teaching and learning activities](https://vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/english-and-english-additional-language/teaching-and-learning) include examining vocabulary choices and connotations, analysing voice and tone, experimenting with sentence structures, and adapting language for purpose and audience. Verbum's model sentences, guided writing and contextual exercises are designed to support those kinds of practice.

These pages informed the learning priorities, not a prescribed word list. Verbum is an independent learning tool and is not endorsed by the VCAA. It does not replace studying the assigned texts, classroom teaching, or the current assessment requirements.

## Precision before ornate language

Words are choices, not automatic upgrades. **Underscore** emphasises an idea; **substantiate** supplies evidence; **refute** makes the stronger claim that a position has been disproved. A student should not substitute any of these indiscriminately for **shows**.

Each entry provides an original definition, an analytical example, two common combinations, a specific usage caution and a gap exercise. Selected confusable words also include an explicit comparison. Related forms can appear in different strands when they have useful grammatical roles, such as **marginalise** and **marginalisation**. The total is a count of distinct headwords and phrases, not a claim of 600 unrelated word families.

For argument analysis, students should connect a specific choice to the contention, audience and context. Naming **anaphora**, for example, is only a starting point: an explanation must identify what is repeated and how that repetition supports the argument. Descriptions of intended audience effects should remain appropriately qualified rather than assuming every reader reacts identically.

## Authorship and examples

The definitions, collocations, cautions and example sentences were newly authored for Verbum with AI assistance. They are not copied dictionary entries or extracts from commercial study guides. All characters, events, quotations inside example sentences, institutions and policies in the teaching examples are **fictional illustrations**, unless explicitly labelled otherwise. They must not be cited as evidence from a prescribed text or as real historical events.

The VCAA pages above are cited for curriculum orientation only. No VCAA examination text, set-text quotation, marking scheme or model answer has been incorporated into the vocabulary data. There has not yet been an independent VCE teacher review of all 600 entries; educational judgement is still needed when applying the terms to particular texts.

## Practice and assessment boundaries

Learners meet a word in context, retrieve it, revisit it and apply it in a guided sentence. Typing practice rehearses spelling and familiar combinations; copying fluently does not, by itself, demonstrate independent understanding. Original writing and explanation remain necessary.

Gap exercises train retrieval of the currently taught target, including its grammatical form. Natural language can admit other sensible answers. A mismatch against the stored answer should not be interpreted as proof that every other sentence completion is ungrammatical or meaningless.

AI suggestions are optional learning feedback, not an examination grade. User-requested additions should be reviewed for accuracy and suitability before students rely on them. Core definitions, examples and retrieval exercises work without an AI provider.

## Maintenance

The data lives in `src/data/analysis-words.ts` and `src/data/literary-words.ts`. Run `npm test -- tests/curriculum.test.ts` after edits. The integrity checks cover all 600 source entries, uniqueness before aggregation, strand counts, populated fields, Australian spelling variants, target use in examples and compatibility between gap answers and headwords. These checks prevent structural regressions; they do not replace editorial review of meaning, naturalness, contextual appropriateness or assessment alignment.

When revising an entry, preserve its stable ID where possible so learners retain their progress. Correct misleading material promptly and review both the example and gap sentence when changing a definition. Revisit the VCAA guidance when the study design changes.
