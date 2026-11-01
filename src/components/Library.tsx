import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, Bookmark, Search, X } from "lucide-react";
import type { LearnerState, Word } from "../types";
import { categories } from "../lib/learning";

export type WordCollection = "all" | "to-learn" | "learned";

export function Library({
  words,
  state,
  collection,
  onCollectionChange,
  onDetail,
  onBookmark,
  onStart,
}: {
  words: Word[];
  state: LearnerState;
  collection: WordCollection;
  onCollectionChange: (collection: WordCollection) => void;
  onDetail: (word: Word) => void;
  onBookmark: (word: Word) => void;
  onStart: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [level, setLevel] = useState("All levels");
  const [saved, setSaved] = useState(false);
  const [limit, setLimit] = useState(24);
  const [flashcards, setFlashcards] = useState<Word[] | null>(null);
  const [card, setCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const learned = words.filter((word) => state.progress[word.id]).length;
  const toLearn = words.length - learned;
  const savedCount = words.filter((word) =>
    state.saved.includes(word.id),
  ).length;
  const activeFilters =
    Number(category !== "All categories") + Number(level !== "All levels");
  const filtered = words.filter(
    (word) =>
      (collection === "all" ||
        (collection === "learned") === Boolean(state.progress[word.id])) &&
      (category === "All categories" || word.category === category) &&
      (level === "All levels" || word.level === level) &&
      (!saved || state.saved.includes(word.id)) &&
      `${word.word} ${word.definition} ${word.collocations.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );
  useEffect(() => setLimit(24), [search, category, level, saved, collection]);
  const clearFilters = () => {
    setSearch("");
    setCategory("All categories");
    setLevel("All levels");
    setSaved(false);
  };
  const collections = [
    { id: "all", label: "All words", count: words.length },
    { id: "to-learn", label: "To learn", count: toLearn },
    { id: "learned", label: "Learned", count: learned },
  ] as const;
  if (flashcards) {
    const current = flashcards[card];
    return (
      <section className="study-session" aria-label="Vocabulary flashcards">
        <div className="session-top">
          <button className="text-button" onClick={() => setFlashcards(null)}>
            Back to word library
          </button>
          <span>
            Card {card + 1} of {flashcards.length}
          </span>
        </div>
        <p>
          Flashcards ·{" "}
          {collection === "learned"
            ? "Learned words"
            : collection === "to-learn"
              ? "Words to learn"
              : "All words"}
          . Flipping a card does not change your learning progress.
        </p>
        <article className="study-card">
          <span className="category-label">Practising this word</span>
          <h1>{current.word}</h1>
          <p className="part-of-speech">{current.partOfSpeech}</p>
          {flipped ? (
            <div role="status">
              <p className="definition">{current.definition}</p>
              <blockquote>{current.example}</blockquote>
              <p className="usage-note">{current.caution}</p>
            </div>
          ) : (
            <p className="study-prompt">
              Say the meaning in your own words, then turn the card to check.
            </p>
          )}
          <button
            className="button primary"
            onClick={() => setFlipped(!flipped)}
          >
            {flipped ? "Hide meaning" : "Show meaning"}
          </button>
        </article>
        <div className="session-top">
          <button
            className="button"
            disabled={card === 0}
            onClick={() => {
              setCard(card - 1);
              setFlipped(false);
            }}
          >
            Previous word
          </button>
          <button
            className="button"
            onClick={() => {
              if (card + 1 === flashcards.length) setFlashcards(null);
              else {
                setCard(card + 1);
                setFlipped(false);
              }
            }}
          >
            {card + 1 === flashcards.length ? "Finish flashcards" : "Next word"}
          </button>
        </div>
      </section>
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Your word library<span>.</span>
          </h1>
          <p>See what’s ahead and return to the words you’ve practised.</p>
        </div>
      </div>
      <div
        className="collection-switcher"
        role="group"
        aria-label="Learning status"
      >
        {collections.map((item) => (
          <button
            key={item.id}
            aria-pressed={collection === item.id}
            onClick={() => onCollectionChange(item.id)}
          >
            {item.label}
            <span>{item.count}</span>
          </button>
        ))}
      </div>
      <p className="collection-note">
        {collection === "learned"
          ? "Learned words have been practised at least once. Regular reviews help them stick."
          : collection === "to-learn"
            ? "Words you haven’t practised yet. Your daily session introduces a few at a time."
            : "Your vocabulary in one place. Open a word for its meaning and examples."}
      </p>
      <div className="library-toolbar">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search vocabulary"
            placeholder="Search words…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              className="icon-button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={16} />
            </button>
          )}
        </label>
        <button
          className={`button saved-filter ${saved ? "primary" : ""}`}
          aria-pressed={saved}
          onClick={() => setSaved(!saved)}
        >
          <Bookmark size={16} aria-hidden="true" />
          Saved words <span>{savedCount}</span>
        </button>
      </div>
      <details className="library-filters">
        <summary>
          Filters{activeFilters > 0 && <span>{activeFilters} active</span>}
        </summary>
        <div className="library-filter-fields">
          <label>
            Category
            <select
              aria-label="Filter category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>All categories</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Difficulty
            <select
              aria-label="Filter difficulty"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option>All levels</option>
              <option>Foundation</option>
              <option>Developing</option>
              <option>Advanced</option>
            </select>
          </label>
          {activeFilters > 0 && (
            <button
              className="text-button"
              onClick={() => {
                setCategory("All categories");
                setLevel("All levels");
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      </details>
      <div className="result-count" role="status">
        <span>
          {filtered.length} {filtered.length === 1 ? "word" : "words"}
          {saved ? " · saved" : ""}
        </span>
        <button
          className="text-button"
          disabled={!filtered.length}
          onClick={() => {
            setFlashcards([...filtered]);
            setCard(0);
            setFlipped(false);
          }}
        >
          Practise these words with flashcards
        </button>
      </div>
      {collection === "learned" && learned === 0 ? (
        <div className="empty-state">
          <h2>Your learned words will appear here.</h2>
          <p>Complete your first study session to start this collection.</p>
          <button className="button primary" onClick={onStart}>
            Start learning <ArrowRight size={16} />
          </button>
        </div>
      ) : collection === "to-learn" && toLearn === 0 ? (
        <div className="empty-state">
          <h2>You’ve practised every word.</h2>
          <p>
            Your learned words are ready to revisit when their reviews are due.
          </p>
          <button
            className="button"
            onClick={() => onCollectionChange("learned")}
          >
            View learned words <ArrowRight size={16} />
          </button>
        </div>
      ) : !filtered.length ? (
        <div className="empty-state">
          <Search size={28} aria-hidden="true" />
          <h2>No words found.</h2>
          <p>
            Try a different search or clear the filters for this collection.
          </p>
          <button className="button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="word-grid">
          {filtered.slice(0, limit).map((word) => {
            const progress = state.progress[word.id];
            const due = progress && Date.parse(progress.due) <= Date.now();
            return (
              <article className="word-card" key={word.id}>
                <div className="word-card-top">
                  <span className={`word-status ${due ? "review-due" : ""}`}>
                    {progress ? (due ? "Review due" : "Learned") : "To learn"}
                  </span>
                  <button
                    className={`icon-button ${state.saved.includes(word.id) ? "bookmarked" : ""}`}
                    aria-label={`${state.saved.includes(word.id) ? "Unsave" : "Save"} ${word.word}`}
                    onClick={() => onBookmark(word)}
                  >
                    <Bookmark
                      size={17}
                      fill={
                        state.saved.includes(word.id) ? "currentColor" : "none"
                      }
                    />
                  </button>
                </div>
                <button
                  className="word-card-main"
                  onClick={() => onDetail(word)}
                >
                  <h2>{word.word}</h2>
                  <span className="part-of-speech">
                    {word.partOfSpeech} · {word.level}
                  </span>
                  <p>{word.definition}</p>
                  <span className="word-card-bottom">
                    <span>{word.category}</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      )}
      {filtered.length > limit && (
        <button
          className="button load-more"
          onClick={() => setLimit((current) => current + 24)}
        >
          Show more words <ArrowDown size={16} />
        </button>
      )}
    </>
  );
}
