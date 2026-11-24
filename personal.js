// Personalization layer for Ben's lessons.
// formal: the precise statement that follows the intuition (he prefers intuition first, then formal).
// use: where the idea pays off, keyed by his goals: interviews (trading interviews), signal (his Kazakh news
// trading signal and hawk-o-meter), languages (learning Kazakh and Mandarin; Russian and French as reference).

export const DEFAULT_PROFILE = {
  style: "intuition-formal",
  scaffold: "adaptive",
  interests: ["trading", "languages", "philosophy"],
  goals: ["interviews", "signal", "languages"],
};

export const PERSONAL = {
  /* ---------- Probability 1 ---------- */
  "p1-naive": {
    formal: "A probability space here is a finite set S with P(A) = |A|/|S| for every A ⊆ S. This P satisfies the axioms: P(∅) = 0, P(S) = 1, and P(A ∪ B) = P(A) + P(B) when A ∩ B = ∅, because cardinality is additive over disjoint sets. That additivity is the whole engine; the naive definition is just the special case where every singleton has mass 1/|S|.",
    use: { interviews: "Interviewers open with dice and cards precisely because the naive definition makes them exact. Say the sample space out loud before counting.", signal: "Your news signal won't have equally likely outcomes. Recognising when the naive definition fails is what stops you computing nonsense like “the tenge either rises or falls, so 50%”." },
  },
  "p1-mult": {
    formal: "If an outcome is a sequence (x₁, ..., xₖ) where, whatever x₁, ..., xᵢ₋₁ were, there are exactly nᵢ choices for xᵢ, then there are n₁·n₂···nₖ outcomes. Proof: induction on k. The condition “whatever came before” matters: the number of options must not depend on earlier choices, even if the options themselves do.",
    use: { interviews: "Most counting questions reduce to choosing the right order of stages so each stage's count doesn't depend on the previous choices." },
  },
  "p1-sampling": {
    formal: "Ordered with replacement: |{1..n}ᵏ| = nᵏ. Ordered without replacement: the injective maps {1..k} → {1..n}, numbering n!/(n−k)! (the falling factorial n^(k)). Bijections of {1..n}: n!. These are exactly the set-theoretic objects you already know: functions, injections, permutations.",
    use: { interviews: "“How many ways” questions are really “how many functions/injections”. Thinking of them that way stops you double counting." },
  },
  "p1-binom": {
    formal: "C(n,k) = |{A ⊆ {1..n} : |A| = k}|. Each k-subset corresponds to exactly k! injections {1..k} → {1..n} with that image, so C(n,k)·k! = n!/(n−k)!. Identities like C(n,k) = C(n−1,k−1) + C(n−1,k) have bijective proofs: split on whether element n is in the subset.",
    use: { interviews: "Story proofs (counting one set two ways) are a favourite interview question: “prove Σ C(n,k) = 2ⁿ without algebra.”" },
  },
  "p1-hyper": {
    formal: "P(exactly j women) = C(w,j)C(m,k−j)/C(w+m,k). Summing over j gives Vandermonde's identity Σⱼ C(w,j)C(m,k−j) = C(w+m,k): the probabilities must add to 1, and that is a combinatorial identity proved by probability.",
    use: { signal: "Sampling a fixed batch of news articles without replacement and counting how many are hawkish is exactly this distribution.", interviews: "Poker-hand probabilities are the standard interview version." },
  },
  "p1-be": {
    formal: "Multisets of size k from n types ↔ binary strings with k stars and n−1 bars, a bijection. So the count is C(n+k−1, k). The bijection is the proof; the warning is that the uniform measure on multisets is not the measure induced by i.i.d. uniform draws.",
    use: { interviews: "“How many ways to split $k among n people” and “non-negative integer solutions” questions are this, verbatim." },
  },
  "p1-compl": {
    formal: "P(Aᶜ) = 1 − P(A) follows from additivity: A and Aᶜ are disjoint with union S. For “at least one”: P(⋃Aᵢ) = 1 − P(⋂Aᵢᶜ), which by independence (when it holds) is 1 − ∏(1 − P(Aᵢ)).",
    use: { interviews: "Any “at least one” question: say “complement” immediately. It's the single most common shortcut interviewers look for.", signal: "Probability that at least one of five news triggers fires in a week = 1 − P(none fires)." },
  },
  "p1-ie": {
    formal: "P(A₁ ∪ ... ∪ Aₙ) = Σ P(Aᵢ) − Σ P(Aᵢ ∩ Aⱼ) + Σ P(Aᵢ ∩ Aⱼ ∩ Aₖ) − ... + (−1)ⁿ⁺¹ P(A₁ ∩ ... ∩ Aₙ). Proof idea: an outcome lying in exactly m of the sets is counted C(m,1) − C(m,2) + ... = 1 − (1−1)ᵐ = 1 time.",
    use: { interviews: "The matching problem (1 − 1/e) and derangements come up constantly." },
  },
  /* ---------- Probability 2 ---------- */
  "p2-cond": {
    formal: "For P(B) > 0, P(·|B) = P(· ∩ B)/P(B) is itself a probability measure on S (check the axioms), concentrated on B. Conditioning is restriction to B followed by renormalisation, so every theorem you prove for P holds for P(·|B).",
    use: { signal: "Your whole signal is a conditional probability: P(tenge falls tomorrow | today's headline is hawkish). Estimating that, and not P(headline | move), is the job.", interviews: "Listing the restricted sample space is the fastest way through conditional dice and card questions." },
  },
  "p2-chain": {
    formal: "P(A₁ ∩ ... ∩ Aₙ) = P(A₁)P(A₂|A₁)···P(Aₙ|A₁, ..., Aₙ₋₁), by repeatedly applying the definition. Valid whenever the conditioning events have positive probability.",
    use: { interviews: "Drawing without replacement: multiply the shrinking fractions.", signal: "A trade that needs three conditions to line up (headline, open-market liquidity, no reversal) has probability equal to the chain product, not the product of unconditional chances." },
  },
  "p2-ltp": {
    formal: "If {Bᵢ} is a partition of S with P(Bᵢ) > 0, then P(A) = Σ P(A|Bᵢ)P(Bᵢ). Proof: A is the disjoint union of the A ∩ Bᵢ; apply additivity and the definition of conditional probability.",
    use: { signal: "Hawk-o-meter: P(rate hike) = P(hike | hawkish tone)P(hawkish) + P(hike | neutral)P(neutral) + P(hike | dovish)P(dovish)." },
  },
  "p2-bayes": {
    formal: "P(A|B) = P(B|A)P(A)/P(B). In odds form: posterior odds = likelihood ratio × prior odds, where the likelihood ratio is P(B|A)/P(B|Aᶜ). The odds form is often faster to compute in your head.",
    use: { signal: "Updating your belief that the National Bank will hike after reading a hawkish statement is Bayes' rule. The base rate (how often they hike at all) matters as much as the statement.", interviews: "Expect at least one disease-test or biased-coin Bayes question. Use the 10,000-people picture or odds form." },
  },
  "p2-bayes2": {
    formal: "P(Bᵢ|A) = P(A|Bᵢ)P(Bᵢ) / Σⱼ P(A|Bⱼ)P(Bⱼ): the posterior over causes is proportional to likelihood × prior, normalised to sum to 1.",
    use: { signal: "Which of several causes (oil price, Russia's rate, a domestic headline) best explains today's tenge move is this calculation." },
  },
  "p2-indep": {
    formal: "Events A₁..Aₙ are independent if P(⋂ᵢ∈ᴵ Aᵢ) = ∏ᵢ∈ᴵ P(Aᵢ) for every subset I. Pairwise independence (only |I| = 2) is strictly weaker. Example: flip two coins; A = first H, B = second H, C = both equal. Each pair is independent, but all three are not.",
    use: { signal: "The most expensive mistake in quant work is assuming independence. Two news sources reporting the same leak are not independent evidence.", interviews: "If an interviewer says “independent”, they're giving you permission to multiply. Ask if it isn't stated." },
  },
  "p2-paradox": {
    formal: "Monty Hall, carefully: let C = car's door, H = door the host opens. P(C=2 | you chose 1, H=3) = P(H=3|C=2)P(C=2) / Σ_c P(H=3|C=c)P(C=c) = (1·1/3) / (1/2·1/3 + 1·1/3 + 0) = 2/3. The host's rule enters through P(H=3|C=c).",
    use: { interviews: "Monty Hall variants test whether you model the host's behaviour. Always ask “what rule generated the information I'm seeing?”", signal: "Selection effects: news you see is chosen by editors, the way Monty chooses doors." },
  },
  /* ---------- Probability 3 ---------- */
  "p3-rv": {
    formal: "A random variable is a function X: S → ℝ. Its distribution is the measure P(X ∈ B) = P(X⁻¹(B)). For discrete X, the PMF p(x) = P(X = x) determines the distribution, with p ≥ 0 and Σ p(x) = 1.",
    use: { signal: "Your signal turns each day into a number (a sentiment score) and each next-day move into another number (a return). Both are random variables on the same day-space." },
  },
  "p3-cdf": {
    formal: "F(x) = P(X ≤ x) is non-decreasing, right-continuous, with limits 0 at −∞ and 1 at +∞. Conversely any such F is the CDF of some random variable. For discrete X, F jumps by p(x) at each atom.",
    use: { signal: "Value-at-risk is a point on the CDF of your daily P&L: the loss you exceed only 5% of days." },
  },
  "p3-binom": {
    formal: "If X₁..Xₙ are i.i.d. Bernoulli(p), then X = ΣXᵢ ~ Bin(n,p) with P(X = k) = C(n,k)pᵏ(1−p)ⁿ⁻ᵏ. The PMF sums to 1 by the binomial theorem: Σ C(n,k)pᵏqⁿ⁻ᵏ = (p+q)ⁿ = 1.",
    use: { signal: "If your signal calls direction right with probability p each day, independently, the number of right calls in n days is Bin(n,p). That's how you test whether 55 hits out of 100 is skill or luck.", interviews: "Coin-flip and free-throw questions." },
  },
  "p3-hyper": {
    formal: "X ~ HGeom(w,b,n): P(X=k) = C(w,k)C(b,n−k)/C(w+b,n), for max(0, n−b) ≤ k ≤ min(w, n). As w+b → ∞ with w/(w+b) → p, it converges to Bin(n,p).",
    use: { interviews: "Card questions without replacement.", signal: "Back-testing on a fixed set of past headlines without reusing any is sampling without replacement." },
  },
  "p3-which": {
    formal: "Identify the generating story: fixed n i.i.d. trials → Binomial; a fixed-size sample without replacement from a finite two-type population → Hypergeometric; one trial → Bernoulli. If X ~ Bin(n,p), then n−X ~ Bin(n,1−p), by relabelling success and failure.",
    use: { interviews: "Naming the distribution out loud (“this is hypergeometric”) signals you see the structure, which is what interviewers grade." },
  },
  /* ---------- Linguistics 1 ---------- */
  "l1-desc": { formal: "A grammar, in the linguist's sense, is a finite system that generates exactly the set of sentences native speakers accept, and none they reject. The data are native-speaker judgements, not style rules.", use: { languages: "When a Kazakh speaker says something your textbook calls “wrong”, believe the speaker: you're learning the descriptive grammar." } },
  "l1-morph": { formal: "A morpheme is a minimal pairing of form and meaning (or grammatical function). Test: a substring is a morpheme if it recurs with the same meaning in other words and the remainder is also meaningful.", use: { languages: "Kazakh and Turkish words are long chains of morphemes. Splitting them is the main skill for reading them, e.g. кітап-тар-ым-да 'in my books'." } },
  "l1-free": { formal: "Free: can occur as an independent word. Bound: occurs only attached to other morphemes. Every affix is bound; roots can be either.", use: { languages: "Mandarin has very few bound morphemes, which is part of why its grammar feels so different from Russian's." } },
  "l1-deriv": { formal: "Inflection realises grammatical features required by the syntax (number, case, tense) and doesn't change the lexeme; derivation forms a new lexeme, often of a new category. Derivation is applied before inflection (closer to the root).", use: { languages: "Russian case endings are inflection; learning them is learning a paradigm, not new words. Russian prefixes like по-, вы-, при- are derivation: they make new verbs." } },
  "l1-affix": { formal: "Prefix, suffix, infix and circumfix are defined by position relative to the root. Non-concatenative morphology (internal change, suppletion, reduplication) marks meaning without adding a linear affix.", use: { languages: "Mandarin uses reduplication (看看 kànkan 'take a look', 人人 rénrén 'everyone'). Russian has suppletion: человек → люди." } },
  "l1-prod": { formal: "Productivity is the probability that a process applies to a new eligible base. Evidence: neologisms, overgeneralisation in acquisition, and acceptance of nonce forms (the wug test).", use: { languages: "Learn the productive patterns first; they cover new words for free. Memorise only the unproductive exceptions." } },
  /* ---------- Linguistics 2 ---------- */
  "l2-type": { formal: "Two scales: index of synthesis (morphemes per word: isolating → polysynthetic) and index of fusion (meanings per morpheme: agglutinative → fusional). Real languages are points in this space, not categories.", use: { languages: "Your three target languages sit far apart: Mandarin isolating, Kazakh agglutinative, Russian fusional. Knowing which you're in tells you what to memorise: particles, suffix chains, or paradigms." } },
  "l2-tree": { formal: "Word formation is binary-branching: each affix selects a base of a particular category and returns a word of some category. The bracketing must be consistent with every affix's selection requirements; when two bracketings are both consistent, the word is ambiguous.", use: { languages: "Long Kazakh words are built in this order too: noun → plural → possessive → case. The order is fixed because each suffix selects what it attaches to." } },
  "l2-allo-pl": { formal: "Underlying /-z/ surfaces as [ɪz] after sibilants (epenthesis), as [s] after voiceless segments (voicing assimilation), and as [z] elsewhere. The rules are ordered: epenthesis before assimilation.", use: { languages: "The same logic predicts Kazakh suffix allomorphs from the stem's final sound, which beats memorising them as lists." } },
  "l2-allo-past": { formal: "Underlying /-d/: epenthesis after /t, d/ → [ɪd]; otherwise it assimilates in voicing to the preceding segment → [t] or [d]. Same two ordered rules as the plural.", use: { languages: "Russian devoices word-final consonants (хлеб is pronounced [xlʲep]): another assimilation rule you'll hear everywhere." } },
  "l2-harmony": { formal: "Front–back vowel harmony: a suffix vowel is underspecified for [±back] and copies the value of the nearest stem vowel. Turkish -lEr → -ler/-lar.", use: { languages: "Kazakh has the same front/back harmony, so every suffix comes in front and back versions: -лар/-лер, -да/-де. One rule covers hundreds of forms." } },
  "l2-compound": { formal: "English compounds are right-headed: the head determines category and semantic type, and the compound carries initial stress. Phrases carry final stress and compositional meaning.", use: { languages: "Mandarin builds most vocabulary by compounding (电脑 'electric brain' = computer). Knowing the parts gives you the word." } },
  /* ---------- Linguistics 3 ---------- */
  "l3-ipa": { formal: "A consonant is specified by three features: [±voice], place, and manner. The IPA gives one symbol per combination that languages actually use.", use: { languages: "Voicing contrasts differ across your languages: Mandarin b/p is aspiration (unaspirated [p] vs aspirated [pʰ]), not voicing. That's why English speakers hear Mandarin “b” as “p”." } },
  "l3-place": { formal: "Places run from labial to glottal along the vocal tract: bilabial, labiodental, dental, alveolar, postalveolar, retroflex, palatal, velar, uvular, pharyngeal, glottal.", use: { languages: "Mandarin zh, ch, sh are retroflex (tongue curled back): [ʈʂ, ʈʂʰ, ʂ]. Kazakh has a uvular [q] (қ), further back than [k]." } },
  "l3-manner": { formal: "Manner is the degree and type of constriction: stop (complete), fricative (turbulent narrow gap), affricate (stop + fricative), nasal (oral closure, velum lowered), approximant (no turbulence).", use: { languages: "Russian ц [ts] and ч [tɕ] are affricates; Mandarin z [ts] and j [tɕ] match them closely, a free shortcut from Russian." } },
  "l3-symbol": { formal: "The consonant chart is a matrix: place × manner, with voiceless/voiced pairs in each cell. A description picks out at most one cell and one side.", use: { languages: "Reading IPA in a dictionary lets you get Kazakh and Mandarin pronunciation right from the start instead of fixing it later." } },
  "l3-vowel": { formal: "Vowels are specified by height, backness and rounding (plus tenseness and length in some languages). The vowel space is a continuum; symbols mark reference points.", use: { languages: "Kazakh has front rounded vowels ө [ø] and ү [y], like French eu and u, which your French already gives you. Russian ы [ɨ] is high central." } },
  "l3-transcribe": { formal: "Broad transcription records contrastive sounds (phonemes, in slashes); narrow transcription records phonetic detail (in brackets).", use: { languages: "Transcribe new Kazakh and Mandarin words as you learn them. Cyrillic and pinyin both hide sounds IPA makes explicit." } },
};

// Extra problems built on Ben's languages (added to the matching lessons' banks).
const mcq = (q, choices, a, sol, hint = "") => ({ q, type: "mc", choices, a, sol, hint });
export const EXTRA_PROBLEMS = {
  "l1-deriv": [
    mcq("Russian книг-ами (knig-ami, 'with books'): the ending -ami is", ["Inflectional", "Derivational"], 0, "It marks instrumental case and plural: grammatical information about the same word. Inflection."),
    mcq("Russian писать 'write' → переписать 'rewrite': the prefix пере- is", ["Inflectional", "Derivational"], 1, "It creates a new verb with a new meaning: derivation."),
  ],
  "l2-type": [
    mcq("Mandarin 我们 wǒmen 'we' = 我 'I' + 们 (plural for people). But most Mandarin words never change form. Overall, Mandarin is", ["Isolating", "Agglutinative", "Fusional", "Polysynthetic"], 0, "Overwhelmingly one morpheme per word, with grammar via particles and order: isolating, despite a few suffix-like elements like 们."),
  ],
  "l2-harmony": [
    mcq("Kazakh plural: бала 'child' → балалар, мектеп 'school' → мектептер. Why -лар after бала but -тер after мектеп?", ["Random", "Vowel harmony picks a/e; the stem's last sound picks л/т", "Only vowel harmony", "Only the last consonant"], 1, "Two conditions at once: the vowel follows front/back harmony (а in бала is back → -лар; е in мектеп is front → -тер), and the consonant depends on the stem's final sound (vowel → л, voiceless п → т)."),
  ],
  "l3-place": [
    mcq("Mandarin sh (as in 是 shì) is articulated", ["Alveolar", "Postalveolar (like English sh)", "Retroflex (tongue tip curled back)", "Velar"], 2, "Mandarin zh/ch/sh are retroflex: [ʈʂ, ʈʂʰ, ʂ]. Mandarin x [ɕ] is the one closer to a palatal 'sh'."),
    mcq("Kazakh қ (as in қазақ) is a voiceless", ["Velar stop [k]", "Uvular stop [q]", "Glottal stop [ʔ]", "Velar fricative [x]"], 1, "қ is uvular [q], made further back than [k], with the back of the tongue against the uvula."),
  ],
  "l3-ipa": [
    mcq("Mandarin b (as in 爸 bà) differs from Mandarin p (怕 pà) in", ["Voicing", "Aspiration", "Place", "Manner"], 1, "Both are voiceless bilabial stops; p is aspirated [pʰ], b is unaspirated [p]. Mandarin contrasts aspiration, not voicing."),
  ],
  "l3-vowel": [
    mcq("Kazakh ү (as in үй 'house') is closest to", ["English 'oo' in boot", "French u in tu", "Russian ы", "English 'ee' in beet"], 1, "ү is a high front rounded vowel [y], the vowel of French tu."),
  ],
};
