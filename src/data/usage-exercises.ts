export type UsageMode = "choice" | "repair";

export interface UsageOption {
  text: string;
  explanation: string;
}

export interface UsageQuestion {
  id: string;
  wordId: string;
  prompt: string;
  /** Original, fictional evidence. It is not a quotation from a set text. */
  context: string;
  /** A gap to complete in choice mode; an intentionally flawed claim in repair mode. */
  sentence: string;
  options: UsageOption[];
  correctIndex: number;
}

type OptionPair = [text: string, explanation: string];
function question(
  id: string,
  wordId: string,
  prompt: string,
  context: string,
  sentence: string,
  correctIndex: number,
  options: OptionPair[],
): UsageQuestion {
  return {
    id,
    wordId,
    prompt,
    context,
    sentence,
    correctIndex,
    options: options.map(([text, explanation]) => ({ text, explanation })),
  };
}

export const choiceExercises: UsageQuestion[] = [
  question(
    "choice-independent-support",
    "corroborate",
    "Choose the verb that specifically identifies independent confirmation.",
    "A witness says the factory alarm failed. A separately recorded maintenance log shows that the alarm had been disconnected that morning.",
    "The maintenance log ___ the witness’s account of the failed alarm.",
    0,
    [
      [
        "corroborates",
        "Corroborates identifies the additional, independent evidence supporting an existing account.",
      ],
      [
        "reiterates",
        "Reiterates means repeats. The log is a separate piece of evidence, not simply another telling of the witness’s claim.",
      ],
      [
        "anticipates",
        "Anticipates means predicts or deals with something beforehand. This sentence is about confirmation, not timing.",
      ],
      [
        "qualifies",
        "Qualifies limits or modifies a claim. The log supports the account rather than restricting it.",
      ],
    ],
  ),
  question(
    "choice-evidence-support",
    "substantiate",
    "Choose the verb that identifies relevant evidence supporting a claim, without claiming absolute proof.",
    "An editorial claims the bus service is unreliable. It presents a month of records showing that one in three services arrived late.",
    "The arrival records ___ the editorial’s claim about unreliability.",
    1,
    [
      [
        "assert",
        "Assert means state a position. The records supply evidence rather than simply stating the claim again.",
      ],
      [
        "substantiate",
        "Substantiate means support with evidence. The recorded delays give the claim a concrete basis.",
      ],
      [
        "refute",
        "Refute means show a claim to be false. These records support the claim rather than contradicting it.",
      ],
      [
        "equivocate about",
        "Equivocation involves evasive or shifting meanings. Nothing in the records indicates that kind of language.",
      ],
    ],
  ),
  question(
    "choice-limited-admission",
    "concession",
    "Name the move that accepts one opposing point while maintaining the main argument.",
    "A speaker defending a new library says, “Yes, construction will be costly. Yet the long-term access it provides makes that investment necessary.”",
    "The admission about construction costs is a ___ within the speaker’s wider defence.",
    2,
    [
      [
        "retraction",
        "A retraction withdraws an earlier claim. The speaker still defends building the library.",
      ],
      [
        "digression",
        "A digression moves away from the main topic. Construction cost is directly relevant to the proposal.",
      ],
      [
        "concession",
        "A concession acknowledges merit in an opposing point without necessarily abandoning the main position.",
      ],
      [
        "refutation",
        "A refutation disproves a claim. Here, the speaker accepts that the cost objection has substance.",
      ],
    ],
  ),
  question(
    "choice-limit-a-claim",
    "qualify",
    "Choose the verb for narrowing a broad claim by adding a condition.",
    "A report initially says the scheme will help every student. It later adds that the benefit depends on reliable internet access.",
    "The condition about internet access ___ the initial claim of universal benefit.",
    3,
    [
      [
        "retracts",
        "Retracts would mean withdrawing the claim. The report retains a more limited claim about who benefits.",
      ],
      [
        "reinforces",
        "Reinforces strengthens a claim. This condition restricts the original claim’s scope.",
      ],
      [
        "paraphrases",
        "Paraphrases restates meaning in different words. The condition changes the claim’s reach.",
      ],
      [
        "qualifies",
        "Qualifies means limits or modifies a statement, here replacing universal benefit with a conditional one.",
      ],
    ],
  ),
  question(
    "choice-side-by-side",
    "juxtapose",
    "Choose the verb that names placing contrasting scenes next to one another.",
    "A film cuts directly from a lavish council banquet to families queuing outside a food bank. Neither scene explains the other in dialogue.",
    "The filmmaker ___ the banquet with the food-bank queue to make the contrast visible.",
    0,
    [
      [
        "juxtaposes",
        "Juxtaposes names the close placement of these two scenes. Explain the inequality this arrangement invites viewers to notice.",
      ],
      [
        "equates",
        "Equates treats things as equivalent. The scene arrangement stresses a difference in circumstances.",
      ],
      [
        "reconciles",
        "Reconciles brings conflicting things into agreement. The contrast remains unresolved.",
      ],
      [
        "chronicles",
        "Chronicles records events in a sequence. It does not specifically name this meaningful side-by-side contrast.",
      ],
    ],
  ),
  question(
    "choice-prominent-experience",
    "foreground",
    "Choose the verb for giving an existing experience particular prominence.",
    "An article opens with three paragraphs of a nurse’s daily experiences before briefly presenting the department’s response.",
    "By giving the nurse the opening and most of the space, the article ___ frontline experience.",
    1,
    [
      [
        "foreshadows",
        "Foreshadows signals a later development. The issue here is what receives immediate prominence.",
      ],
      [
        "foregrounds",
        "Foregrounds identifies the priority given to the nurse’s experience through placement and space.",
      ],
      [
        "relegates",
        "Relegates pushes something into a less prominent position, the opposite of the article’s opening emphasis.",
      ],
      [
        "obscures",
        "Obscures makes something harder to see or understand. The nurse’s experience is made highly visible.",
      ],
    ],
  ),
  question(
    "choice-early-signal",
    "foreshadow",
    "Choose the verb that connects an early warning to a later event.",
    "In chapter one, a character hides a second train ticket. In the final chapter, she secretly leaves the town with her brother.",
    "The hidden ticket ___ the later escape.",
    2,
    [
      [
        "commemorates",
        "Commemorates honours or preserves the memory of an event. The ticket appears before the escape.",
      ],
      [
        "recapitulates",
        "Recapitulates summarises something already presented. The escape has not yet occurred.",
      ],
      [
        "foreshadows",
        "Foreshadows identifies an early detail that points towards a later development. The timing is essential.",
      ],
      [
        "resolves",
        "Resolves settles a conflict or uncertainty. The ticket creates a clue rather than settling the story’s conflict.",
      ],
    ],
  ),
  question(
    "choice-complicate-binary",
    "problematise",
    "Choose the verb for exposing complications in an apparently simple distinction.",
    "A novel initially separates obedient citizens from criminal outsiders. It then shows an outlaw protecting children while a respected official exploits them.",
    "These contrasting actions ___ the novel’s initial division between lawful virtue and criminal wrongdoing.",
    3,
    [
      [
        "idealise",
        "Idealise presents something as better or more perfect than it is. These actions expose difficulties in the division.",
      ],
      [
        "codify",
        "Codify arranges principles into a formal system. The novel is unsettling a category, not formalising it.",
      ],
      [
        "simplify",
        "Simplify makes the distinction easier or less complex. The new actions do the opposite.",
      ],
      [
        "problematise",
        "Problematise shows why a seemingly clear distinction is contested or inadequate. It does not merely mean “cause a problem”.",
      ],
    ],
  ),
  question(
    "choice-make-clear",
    "elucidate",
    "Choose the verb for making a previously puzzling motive clear through explanation.",
    "For most of the story, the daughter refuses to enter the house. A final conversation explains that it was sold to pay for the treatment she believes harmed her father.",
    "The final conversation ___ the daughter’s earlier refusal.",
    0,
    [
      [
        "elucidates",
        "Elucidates means makes clearer by explaining. The conversation supplies the missing reason for her behaviour.",
      ],
      [
        "alludes to",
        "Alludes to means refers indirectly or briefly. This conversation explains the motive rather than merely hinting at it.",
      ],
      [
        "obscures",
        "Obscures makes the motive less clear. Here the reader receives the relevant explanation.",
      ],
      [
        "contests",
        "Contests challenges something. The conversation explains the refusal without disputing that it happened.",
      ],
    ],
  ),
  question(
    "choice-condensed-attitude",
    "encapsulate",
    "Choose the verb for expressing a larger attitude in one compact phrase.",
    "Throughout a story, the town rejects newcomers. Its motto is the three-word phrase “Our own first.”",
    "The motto ___ the town’s exclusionary attitude.",
    1,
    [
      [
        "elaborates",
        "Elaborates develops an idea in more detail. This brief phrase compresses the attitude instead.",
      ],
      [
        "encapsulates",
        "Encapsulates identifies how a concise detail captures the essential qualities of a larger attitude.",
      ],
      [
        "contradicts",
        "Contradicts conflicts with the attitude. The motto is consistent with the town’s treatment of newcomers.",
      ],
      [
        "conceals",
        "Conceals hides something. The motto makes the town’s preference for its own members explicit.",
      ],
    ],
  ),
  question(
    "choice-weaken-not-disprove",
    "undermine",
    "Choose the verb for weakening credibility without proving every claim false.",
    "A spokesperson changes the reported cost three times without explanation. Other parts of her proposal have not been investigated.",
    "The unexplained changes ___ the spokesperson’s credibility.",
    2,
    [
      [
        "vindicate",
        "Vindicate clears a person from suspicion or justifies a position. The inconsistency gives readers reason for doubt.",
      ],
      [
        "corroborate",
        "Corroborate supplies additional support. Contradictory figures do not confirm her reliability.",
      ],
      [
        "undermine",
        "Undermine means weaken. It captures the damage to credibility without claiming that every statement has been disproved.",
      ],
      [
        "establish",
        "Establish would suggest securing or demonstrating credibility. The changing figures make that harder.",
      ],
    ],
  ),
  question(
    "choice-bring-feeling-to-mind",
    "evoke",
    "Choose the verb for bringing a feeling or memory to mind.",
    "A narrator describes the smell of wet wool and the sound of a familiar kettle while remembering childhood winters.",
    "The sensory details may ___ nostalgia in readers with similar memories.",
    3,
    [
      [
        "invoke",
        "Invoke usually means call on an authority, principle or power. Here the emphasis is a feeling brought to mind.",
      ],
      [
        "revoke",
        "Revoke means officially cancel or withdraw. It does not describe an emotional association.",
      ],
      [
        "infer",
        "Infer is an act of interpretation from evidence. The details are prompting a feeling, not drawing a conclusion themselves.",
      ],
      [
        "evoke",
        "Evoke names bringing a feeling, memory or image to mind. “May” avoids assuming that every reader responds identically.",
      ],
    ],
  ),
  question(
    "choice-writer-sends-meaning",
    "imply",
    "Choose the verb for a writer communicating indirectly.",
    "A columnist describes a mayor’s new car immediately after mentioning cuts to public transport, but never explicitly calls the mayor hypocritical.",
    "By placing these details together, the columnist may ___ that the mayor’s priorities are self-serving.",
    0,
    [
      [
        "imply",
        "Writers imply when they communicate a meaning without stating it directly. The arrangement suggests the criticism.",
      ],
      [
        "infer",
        "Readers infer a meaning from clues. This sentence describes what the columnist communicates.",
      ],
      [
        "declare",
        "Declare means state explicitly. The context says the criticism is left unstated.",
      ],
      [
        "concede",
        "Concede accepts a point, often from an opposing view. The columnist is suggesting criticism, not admitting an objection.",
      ],
    ],
  ),
  question(
    "choice-reader-draws-conclusion",
    "infer",
    "Choose the verb for a reader reaching a conclusion from textual clues.",
    "A character says she is pleased, yet repeatedly tears up the congratulatory letters. The narrator does not name her feeling.",
    "From this contradiction, readers may ___ that her stated happiness conceals resentment.",
    1,
    [
      [
        "imply",
        "Imply means communicate indirectly. Here readers are interpreting the writer’s clues.",
      ],
      [
        "infer",
        "Infer means draw a conclusion from evidence that does not state it directly. The contradictory actions supply that evidence.",
      ],
      [
        "stipulate",
        "Stipulate means specify a condition. Readers are interpreting rather than setting terms.",
      ],
      [
        "proclaim",
        "Proclaim means announce openly. The sentence concerns forming an interpretation, not broadcasting it.",
      ],
    ],
  ),
  question(
    "choice-ridicule-a-system",
    "satirise",
    "Choose the verb for using absurd humour to criticise an institution.",
    "In a comic scene, a council forms a committee to decide whether it needs a committee to investigate delays. Nobody addresses the original delay.",
    "The circular committee process ___ bureaucratic inefficiency.",
    2,
    [
      [
        "memorialises",
        "Memorialises preserves or honours a memory. The scene ridicules a current institutional habit.",
      ],
      [
        "idealises",
        "Idealises presents something favourably or perfectly. The absurdity makes the system look foolish.",
      ],
      [
        "satirises",
        "Satirises links the humour to its critical target: a bureaucracy that multiplies procedure while avoiding action.",
      ],
      [
        "legitimises",
        "Legitimises makes something seem justified or acceptable. The ridicule challenges the system’s legitimacy.",
      ],
    ],
  ),
  question(
    "choice-precise-boundaries",
    "delineate",
    "Choose the verb for carefully setting out the boundaries of a distinction.",
    "An essay defines forgiveness as releasing resentment, distinguishes it from forgetting, and specifies that it need not restore trust.",
    "These definitions ___ the distinction between forgiveness and reconciliation.",
    3,
    [
      [
        "blur",
        "Blur makes a boundary less clear. The essay carefully separates the two ideas.",
      ],
      [
        "collapse",
        "Collapse a distinction means erase it by treating the ideas as equivalent. This essay preserves their differences.",
      ],
      [
        "evade",
        "Evade means avoid addressing something. The definitions directly examine the distinction.",
      ],
      [
        "delineate",
        "Delineate means describe or mark out precise boundaries and details. It suits the essay’s careful conceptual separation.",
      ],
    ],
  ),
  question(
    "choice-word-association",
    "connotation",
    "Name the association carried by a word beyond its literal reference.",
    "An opinion piece calls a modest dwelling a “home”, then describes shared meals and familiar family rituals. Beyond naming a dwelling, the word suggests warmth and belonging.",
    "The word “home” carries a positive ___ of belonging.",
    0,
    [
      [
        "connotation",
        "Connotation identifies an associated feeling or idea beyond the literal reference; here “home” suggests belonging beyond simply naming a dwelling.",
      ],
      [
        "chronology",
        "Chronology concerns the order of events, not the associations of a particular word.",
      ],
      [
        "syllogism",
        "A syllogism is a form of reasoning from linked premises. One word’s emotional association is not that structure.",
      ],
      [
        "counterclaim",
        "A counterclaim opposes another claim. This sentence identifies a word’s association rather than an opposing position.",
      ],
    ],
  ),
  question(
    "choice-believability",
    "credibility",
    "Name the quality of appearing believable, rather than the truth of every conclusion.",
    "A researcher identifies the limits of her small study and openly corrects a calculation error. These choices may make readers more willing to trust her.",
    "Acknowledging the limits may strengthen the researcher’s ___.",
    1,
    [
      [
        "unanimity",
        "Unanimity means complete agreement within a group. This passage concerns readers’ trust in one speaker.",
      ],
      [
        "credibility",
        "Credibility concerns appearing believable or trustworthy. The admission of limits may support that impression without proving every claim.",
      ],
      [
        "inevitability",
        "Inevitability means an outcome cannot be avoided. No unavoidable result is established here.",
      ],
      [
        "causation",
        "Causation is a relationship in which one factor produces an outcome. It is not the name for a speaker’s believability.",
      ],
    ],
  ),
  question(
    "choice-limit-certainty",
    "hedging",
    "Name the language that explicitly limits a prediction’s certainty.",
    "A report states, “These measures may reduce congestion in some suburbs.” It avoids promising an improvement everywhere.",
    "The words “may” and “some” introduce ___ into the prediction.",
    2,
    [
      [
        "hyperbole",
        "Hyperbole exaggerates. These words make a narrower and less certain claim.",
      ],
      [
        "invective",
        "Invective is abusive or insulting language. Neither word attacks anyone.",
      ],
      [
        "hedging",
        "Hedging limits certainty or scope. “May” marks possibility and “some” restricts the places covered.",
      ],
      [
        "unanimity",
        "Unanimity describes total agreement, not the linguistic qualifications within a prediction.",
      ],
    ],
  ),
  question(
    "choice-balanced-opposition",
    "antithesis",
    "Name the balanced contrast between opposing ideas.",
    "A campaign slogan reads, “Rich in promises, poor in results.” Its paired phrases use the same structure to contrast abundance with scarcity.",
    "The balanced opposition between “rich” and “poor” creates ___.",
    3,
    [
      [
        "euphemism",
        "A euphemism softens an unpleasant idea. This slogan makes its criticism sharper rather than gentler.",
      ],
      [
        "anecdote",
        "An anecdote is a brief account of an incident. The slogan does not tell a story.",
      ],
      [
        "concession",
        "A concession acknowledges merit in an opposing point. The paired phrases instead sharpen a criticism.",
      ],
      [
        "antithesis",
        "Antithesis names a pointed opposition between ideas, often expressed in balanced phrasing as it is here.",
      ],
    ],
  ),
];

export const repairExercises: UsageQuestion[] = [
  question(
    "repair-juxtapose-pattern",
    "juxtapose",
    "Repair the verb pattern while preserving the intended contrast.",
    "A film places a banquet scene immediately beside a scene of a crowded shelter.",
    "The director juxtaposes the banquet to the shelter to expose inequality.",
    0,
    [
      [
        "The director juxtaposes the banquet with the shelter to expose inequality.",
        "Use “juxtapose X with Y”. This repair keeps both elements and the analytical purpose.",
      ],
      [
        "The director juxtaposes between the banquet and the shelter to expose inequality.",
        "Juxtapose takes the elements as its objects; “juxtaposes between” is not the appropriate verb pattern.",
      ],
      [
        "The director juxtaposes the banquet because the shelter to expose inequality.",
        "“Because the shelter” does not form a complete causal clause and does not express the pairing.",
      ],
      [
        "The director juxtaposes inequality with the banquet to remove the shelter.",
        "This changes the evidence and invents an action. A repair should preserve the original analytical claim.",
      ],
    ],
  ),
  question(
    "repair-attribute-pattern",
    "attribute",
    "Repair the preposition without presenting the narrator’s explanation as established fact.",
    "The narrator claims that secrecy caused the family’s estrangement; the novel offers other possible explanations too.",
    "The narrator attributes the estrangement with the family’s secrecy.",
    1,
    [
      [
        "The narrator attributes the family’s secrecy from the estrangement.",
        "This reverses the proposed cause and outcome and uses the wrong preposition.",
      ],
      [
        "The narrator attributes the estrangement to the family’s secrecy.",
        "Use “attribute an outcome to a cause”. Keeping “the narrator” makes clear whose explanation this is.",
      ],
      [
        "The family’s secrecy unquestionably proves the cause of every estrangement.",
        "This overstates the evidence and removes the distinction between a narrator’s interpretation and a proven cause.",
      ],
      [
        "The narrator attributes about the estrangement with secrecy.",
        "“Attributes about” is not the required construction; the outcome is attributed to its proposed cause.",
      ],
    ],
  ),
  question(
    "repair-writer-implies",
    "imply",
    "Repair the verb for a writer suggesting a meaning to the reader.",
    "The poet places an untouched meal beside a departing train ticket, suggesting abandonment without naming it.",
    "Through these details, the poet infers that the speaker has been abandoned.",
    2,
    [
      [
        "Through these details, the poet proves that every reader has been abandoned.",
        "This replaces a textual suggestion with an unsupported claim about readers’ lives.",
      ],
      [
        "Through these details, the poet’s abandonment infers the readers.",
        "An abandonment does not infer readers; infer describes drawing an interpretation from evidence.",
      ],
      [
        "Through these details, the poet implies that the speaker has been abandoned.",
        "The poet communicates the suggestion, so “implies” fits. Readers may then infer the abandonment.",
      ],
      [
        "Through these details, the poet states explicitly that the speaker has been abandoned.",
        "The evidence says the meaning is suggested rather than named explicitly.",
      ],
    ],
  ),
  question(
    "repair-reader-infers",
    "infer",
    "Repair the verb for the reader interpreting evidence.",
    "A character repeatedly hides letters from his sister. The narration does not explain why.",
    "From the hidden letters, readers imply that he distrusts his sister.",
    3,
    [
      [
        "From the hidden letters, readers announce that distrust is the only possible interpretation.",
        "The evidence allows an interpretation but does not exclude all other explanations.",
      ],
      [
        "From the hidden letters, the sister implies the readers into distrust.",
        "This changes who is interpreting and produces an incorrect grammatical pattern.",
      ],
      [
        "From the hidden letters, readers explicitly state the narrator’s unnamed reason.",
        "Readers cannot turn an unstated motive into a narrator’s explicit statement.",
      ],
      [
        "From the hidden letters, readers may infer that he distrusts his sister.",
        "Readers infer from clues. “May” recognises that the evidence supports a possible interpretation, not certainty.",
      ],
    ],
  ),
  question(
    "repair-elucidate-object",
    "elucidate",
    "Remove the unnecessary preposition while retaining the meaning of clarification.",
    "A final explanation makes a character’s earlier hesitation understandable.",
    "The final explanation elucidates on the character’s hesitation.",
    0,
    [
      [
        "The final explanation elucidates the character’s hesitation.",
        "Elucidate takes a direct object: it elucidates an idea, motive or problem. “On” is unnecessary here.",
      ],
      [
        "The final explanation elucidates to the character’s hesitation.",
        "“To” does not solve the problem. The hesitation is the direct object of elucidates.",
      ],
      [
        "The final explanation is elucidate about the character’s hesitation.",
        "After “is”, the base verb elucidate does not form a correct passive construction.",
      ],
      [
        "The final explanation conceals the character’s hesitation.",
        "Conceals reverses the meaning: the context says the explanation makes the hesitation clearer.",
      ],
    ],
  ),
  question(
    "repair-mitigate-pattern",
    "mitigate",
    "Choose the repair that means make harm less severe.",
    "A public apology reduces, but does not remove, the hostility caused by an earlier insult.",
    "The apology mitigates against the hostility caused by the insult.",
    1,
    [
      [
        "The apology eliminates all hostility caused by the insult.",
        "Eliminates overstates the evidence. Some hostility remains.",
      ],
      [
        "The apology mitigates the hostility caused by the insult.",
        "Mitigate takes the harm as its object and means reduce its severity. Do not confuse it with “militate against”.",
      ],
      [
        "The apology militates the hostility caused by the insult.",
        "“Militate” normally appears in “militate against”; it is not a direct-object replacement for mitigate.",
      ],
      [
        "The apology mitigates for the hostility caused by the insult.",
        "“Mitigates for” is not the appropriate construction for reducing hostility.",
      ],
    ],
  ),
  question(
    "repair-ambivalent-meaning",
    "ambivalent",
    "Repair the explanation so that it matches the word “ambivalent”.",
    "A narrator admires the school’s sense of community but resents its strict control over students.",
    "The narrator is ambivalent because she feels nothing at all about the school.",
    2,
    [
      [
        "The narrator is ambivalent because she rejects every aspect of the school.",
        "Complete rejection is not the mixed evaluation presented in the source.",
      ],
      [
        "The narrator is ambivalent because she knows nothing about the school.",
        "Ambivalence does not mean lack of knowledge; the source gives two conflicting evaluations.",
      ],
      [
        "The narrator is ambivalent, admiring the school’s community while resenting its control.",
        "Ambivalent means holding conflicting feelings towards the same subject. This repair names both sides.",
      ],
      [
        "The narrator is ambivalent because her admiration leaves no room for resentment.",
        "This removes the conflict that makes “ambivalent” appropriate.",
      ],
    ],
  ),
  question(
    "repair-connotation-evidence",
    "connotation",
    "Repair the interpretation so that it follows the quoted word’s association in this context.",
    "An article calls a modest dwelling a “home”, then describes shared meals and familiar family rituals that give its residents a sense of belonging.",
    "The negative connotation of “home” makes the dwelling seem threatening.",
    3,
    [
      [
        "The word “home” always means a dangerous place, regardless of context.",
        "This misdefines the word and ignores the warmth of the article’s description of shared meals and family rituals.",
      ],
      [
        "The connotation proves that every reader has visited this dwelling.",
        "A word’s associations cannot establish facts about every reader’s experiences.",
      ],
      [
        "The connotation of “home” explains the article’s chronological order.",
        "Connotation concerns associated meaning, not the order in which events are presented.",
      ],
      [
        "The warm connotation of “home” presents the dwelling as a place of belonging.",
        "The association of warmth and belonging goes beyond the literal dwelling and fits the shared meals and family rituals described.",
      ],
    ],
  ),
  question(
    "repair-evidence-scope",
    "substantiate",
    "Keep the claim within the evidence’s actual scope.",
    "An editorial presents a month of late-arrival records from one bus route. It does not measure audience responses or other routes.",
    "The records substantiate that every route is unreliable and every reader agrees.",
    0,
    [
      [
        "The records substantiate the claim that the surveyed route was unreliable during that month.",
        "This identifies the supported claim and preserves the limits of place and time. It does not invent audience agreement.",
      ],
      [
        "The records substantiate that no bus anywhere will ever arrive on time.",
        "This is a universal prediction that a month’s local records cannot support.",
      ],
      [
        "The records substantiate universal audience agreement because numbers are always persuasive.",
        "Numbers do not guarantee agreement, and audience responses were not measured.",
      ],
      [
        "The records substantiate nothing because evidence from one route can never support a claim.",
        "This goes too far in the other direction: local evidence can support a suitably limited local claim.",
      ],
    ],
  ),
  question(
    "repair-repetition-not-corroboration",
    "corroborate",
    "Distinguish repeating a claim from independently supporting it.",
    "A columnist repeats “the service is failing” in three paragraphs, but supplies no new source, example or data.",
    "The repetition corroborates the columnist’s claim through independent evidence.",
    1,
    [
      [
        "The repetition independently proves the service’s failure because the claim appears three times.",
        "Frequency of assertion is not independent evidence. Repeating a claim cannot by itself prove it.",
      ],
      [
        "The repetition reinforces the emphasis on failure but does not itself corroborate the claim.",
        "Repetition can increase emphasis. Corroboration would require additional supporting evidence.",
      ],
      [
        "The repetition refutes the claim because a repeated statement must be false.",
        "Lack of corroboration does not establish that the claim is false.",
      ],
      [
        "The repetition corroborates only readers who already agree with the service.",
        "Corroborate applies to supporting an account or claim, not confirming a category of readers in this way.",
      ],
    ],
  ),
  question(
    "repair-foreshadow-timing",
    "foreshadow",
    "Choose a description that respects the order of events.",
    "After the rebellion has ended, the final chapter looks back at the first secret meeting and explains its significance.",
    "The final recollection foreshadows the rebellion that has already ended.",
    2,
    [
      [
        "The final recollection foreshadows the rebellion because every reference to an event is foreshadowing.",
        "Foreshadowing requires an earlier indication of a later event, not just any reference.",
      ],
      [
        "The final recollection occurs before the rebellion in the novel’s presentation.",
        "This contradicts the given sequence: the recollection is presented after the rebellion.",
      ],
      [
        "The final recollection retrospectively clarifies the origins of the rebellion.",
        "Retrospectively accurately describes looking back. The recollection explains an event already presented.",
      ],
      [
        "The final recollection guarantees that the rebellion will happen again.",
        "The source gives no evidence of recurrence. A repair should not invent a new plot outcome.",
      ],
    ],
  ),
  question(
    "repair-satire-needs-target",
    "satirise",
    "Avoid calling humour satire without identifying a critical target.",
    "A comic scene shows a character slipping on spilled soup. No social habit, institution or belief is criticised in the surrounding passage.",
    "The slipping scene satirises society simply because it is funny.",
    3,
    [
      [
        "The scene satirises every institution because all humour is social criticism.",
        "Humour alone does not establish satire, and “every institution” is an unsupported extension.",
      ],
      [
        "The scene is satire because slipping is always a political act.",
        "This invents a fixed political meaning unsupported by the passage.",
      ],
      [
        "The scene cannot be humorous unless it satirises an institution.",
        "Humour can entertain without criticising an institution or social behaviour.",
      ],
      [
        "The scene creates physical comedy; a claim of satire would need evidence of what it criticises.",
        "This distinguishes the observed humour from a further interpretation that needs a demonstrable critical target.",
      ],
    ],
  ),
  question(
    "repair-problematise-meaning",
    "problematise",
    "Replace a misused academic verb with a precise description of the actual effect.",
    "A power cut delays a train by an hour. The passage does not question any assumption or definition about travel.",
    "The power cut problematises the train by making it late.",
    0,
    [
      [
        "The power cut delays the train by an hour.",
        "Delays states the actual effect clearly. Problematise means expose conceptual complications, not merely cause an inconvenience.",
      ],
      [
        "The power cut problematises against the train by an hour.",
        "The preposition does not fix the misuse of problematise or produce an appropriate verb pattern.",
      ],
      [
        "The power cut proves that all travel is morally impossible.",
        "This imports a sweeping conceptual claim unsupported by the passage.",
      ],
      [
        "The train is a problematisation because it has a practical problem.",
        "A practical problem is not automatically a problematisation of an idea or assumption.",
      ],
    ],
  ),
  question(
    "repair-example-not-universal-proof",
    "exemplify",
    "Preserve the example while removing an unsupported generalisation.",
    "One official refuses to answer a question. The text supplies no evidence about every other official.",
    "This refusal exemplifies that every official is always evasive.",
    1,
    [
      [
        "This refusal exemplifies universal corruption in every public institution.",
        "A single refusal cannot establish corruption across all institutions.",
      ],
      [
        "This refusal exemplifies evasive behaviour without establishing that all officials behave this way.",
        "An instance can exemplify a quality. This repair separates the observed example from an unsupported universal claim.",
      ],
      [
        "This refusal cannot exemplify anything because it is only one example.",
        "Exemplify can refer to one representative instance; the problem is the overgeneralisation, not the existence of a single example.",
      ],
      [
        "This refusal exemplifies around the official’s evasion.",
        "“Exemplifies around” is not an appropriate grammatical pattern and does not resolve the claim’s scope.",
      ],
    ],
  ),
  question(
    "repair-rhetoric-not-automatic-deceit",
    "rhetoric",
    "Repair the assumption that persuasive language must be dishonest.",
    "A campaign speech combines a factual local example with an appeal to shared responsibility. No deception is established.",
    "The speech uses rhetoric, which proves that its argument is dishonest.",
    2,
    [
      [
        "The speech is dishonest because any appeal to shared responsibility is a lie.",
        "An appeal to a value is not automatically false; deception requires evidence.",
      ],
      [
        "The speech cannot contain rhetoric because it includes a factual example.",
        "Rhetoric can use facts, reasoning and values. Factual content does not exclude persuasive design.",
      ],
      [
        "The speech’s rhetoric combines an example with shared values to encourage support.",
        "Rhetoric names purposeful persuasion. This repair identifies the choices without making an unsupported accusation of dishonesty.",
      ],
      [
        "The speech’s rhetoric guarantees that all listeners will support the campaign.",
        "An intended persuasive effect does not guarantee a uniform audience response.",
      ],
    ],
  ),
  question(
    "repair-relevant-authority",
    "ethos",
    "Separate a claim to authority from evidence of relevant expertise.",
    "An advertisement uses a famous actor to endorse a technical claim about bridge safety. It gives no engineering qualifications.",
    "The actor’s fame establishes expert ethos and proves the bridge is safe.",
    3,
    [
      [
        "The actor’s fame proves that the bridge meets every engineering standard.",
        "Celebrity does not supply technical verification or relevant engineering expertise.",
      ],
      [
        "The actor’s fame means the bridge must be unsafe.",
        "An irrelevant endorsement does not prove the opposite claim either.",
      ],
      [
        "The actor has engineering expertise because the advertisement calls him famous.",
        "Fame and field-specific expertise are different; the advertisement supplies no link between them.",
      ],
      [
        "The advertisement borrows the actor’s public reputation to build ethos, but supplies no relevant engineering expertise.",
        "This explains the credibility strategy while recognising its evidential limitation. It does not claim that reputation proves safety.",
      ],
    ],
  ),
  question(
    "repair-intended-emotional-effect",
    "pathos",
    "Describe an intended emotional appeal without claiming to know every reader’s response.",
    "A charity appeal describes a child waiting alone after a flood. No audience survey is available.",
    "The pathos makes every reader feel exactly the same grief and donate immediately.",
    0,
    [
      [
        "The account draws on pathos to invite concern for the child and encourage donations.",
        "This identifies the emotional appeal and its purpose while allowing for different reader responses.",
      ],
      [
        "The pathos proves that every reader has experienced a flood.",
        "An emotional appeal cannot prove readers’ personal histories.",
      ],
      [
        "The account contains no pathos unless every reader donates.",
        "A persuasive strategy can be present even if it does not succeed with every audience member.",
      ],
      [
        "The account’s pathos objectively measures the amount of grief each reader feels.",
        "Pathos is an appeal, not a measurement of an audience’s emotions.",
      ],
    ],
  ),
  question(
    "repair-false-dichotomy-evidence",
    "false-dichotomy",
    "Identify the omitted alternative that makes the binary misleading.",
    "A speaker says, “Either ban all cars in the centre or accept endless congestion.” The debate also includes timed access and limited delivery permits.",
    "The statement is a false dichotomy because it mentions two things.",
    1,
    [
      [
        "The statement is a false dichotomy because every pair of alternatives is necessarily false.",
        "Two alternatives are not automatically misleading. The issue is excluding plausible additional options.",
      ],
      [
        "The false dichotomy between a total ban and accepting endless congestion excludes the proposed limits on access.",
        "This identifies the binary and the actual omitted alternative, making the reasoning error specific.",
      ],
      [
        "The statement is a false dichotomy because cars and congestion are identical.",
        "Cars and congestion are not identical, and identity is not the basis of this reasoning error.",
      ],
      [
        "The statement proves that limited access is impossible because the speaker does not mention it.",
        "Omission is not evidence that an alternative is impossible. It is precisely what the analysis should examine.",
      ],
    ],
  ),
  question(
    "repair-correlation-causation",
    "correlation",
    "Repair a causal claim that goes beyond the data provided.",
    "A report shows that library visits and reading scores rose in the same year. It does not control for other changes or identify a causal mechanism.",
    "The correlation proves that library visits alone caused the improvement.",
    2,
    [
      [
        "The correlation proves that improved scores alone caused every library visit.",
        "Reversing the causal direction does not solve the absence of causal evidence.",
      ],
      [
        "The correlation proves that the two changes are completely unrelated.",
        "An observed association is not proof of no relationship; it is insufficient by itself to establish causation.",
      ],
      [
        "The figures show a correlation, but do not establish that library visits alone caused the improvement.",
        "This preserves the observed association and states the limit of what it establishes. Other explanations remain possible.",
      ],
      [
        "The correlation proves causation because both measures rose at the same time.",
        "Moving together is the association described by correlation; it does not, by itself, establish a causal mechanism.",
      ],
    ],
  ),
  question(
    "repair-personal-stake",
    "vested-interest",
    "Describe a possible influence without treating it as automatic disproof.",
    "A property developer endorses a zoning proposal that would increase the value of her land. Her technical claims have not yet been checked.",
    "Her vested interest proves that every claim she makes is false.",
    3,
    [
      [
        "Her vested interest proves that every claim she makes is true.",
        "A personal benefit does not establish the truth of a claim any more than it establishes its falsity.",
      ],
      [
        "Her vested interest means her evidence must never be examined.",
        "The interest is a reason for scrutiny, not for refusing to examine evidence.",
      ],
      [
        "Her vested interest exists only if she admits she is lying.",
        "A stake in the outcome can exist without an admission of deception.",
      ],
      [
        "Her vested interest warrants scrutiny of her endorsement, but does not by itself disprove her claims.",
        "This identifies the potential influence while leaving factual claims to be assessed on their evidence.",
      ],
    ],
  ),
];

export const usageExercises: Record<UsageMode, UsageQuestion[]> = {
  choice: choiceExercises,
  repair: repairExercises,
};

export const USAGE_SESSION_LENGTH = 5;
