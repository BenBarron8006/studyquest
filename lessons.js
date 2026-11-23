// In-app lessons. Each unit is a sequence of knowledge points (KPs): a short explanation, a worked example,
// then practice from a generator (fresh numbers every time) or a problem bank. Text may use <b>, <i>, <sup>, <sub>, <br>.
// Probability lessons follow Blitzstein & Hwang, "Introduction to Probability" (Stat 110), Ch. 1–3.
// Linguistics lessons follow MIT 24.900 (Introduction to Linguistics), units 1–3.

const mcq = (q, choices, a, sol, hint = "") => ({ q, type: "mc", choices, a, sol, hint });
const num = (q, a, sol, hint = "") => ({ q, type: "num", a, sol, hint });

export const LESSONS = {
  /* ======================= PROBABILITY 1: Counting ======================= */
  prob1: [
    {
      id: "p1-naive", title: "Sample spaces and the naive definition",
      teach: `An <b>experiment</b> has a set of possible outcomes, the <b>sample space</b> S. An <b>event</b> A is a subset of S. Probability is about measuring how big A is relative to S.
<br><br>The simplest rule, the <b>naive definition</b>: if S is finite and every outcome is equally likely, then
<br><br><b>P(A) = (number of outcomes in A) / (number of outcomes in S)</b>.
<br><br>Two warnings that cause most early mistakes:
<br>• It only works when outcomes are <i>equally likely</i>. "Either it rains or it doesn't" does not make rain 1/2.
<br>• Choose a sample space where outcomes really are equally likely. For two dice, use ordered pairs (first die, second die): 36 of them. Unordered sums are not equally likely: a sum of 7 happens 6 ways, a sum of 2 only 1 way.`,
      example: { q: "Flip a fair coin 3 times. What is P(exactly 2 heads)?", steps: ["Sample space: all sequences of 3 flips. Each flip has 2 outcomes, so |S| = 2·2·2 = 8, all equally likely.", "Event: sequences with exactly two H: HHT, HTH, THH. That's 3.", "P = 3/8."] },
      gen: "diceSum",
    },
    {
      id: "p1-mult", title: "The multiplication rule",
      teach: `If an experiment happens in stages, with a outcomes for stage 1 and, for each of those, b outcomes for stage 2, there are <b>a·b</b> outcomes in total. It extends to any number of stages: multiply.
<br><br>Picture a tree: each branch at stage 1 splits into b branches at stage 2. The number of leaves is a·b.
<br><br>The stages don't have to be independent in what they <i>are</i>, only in <i>how many</i> options they have. Picking a president then a different vice-president from 10 people: 10 options, then 9 (whoever is left), so 90.`,
      example: { q: "How many 4-character passwords use a letter (26 options) followed by 3 digits?", steps: ["Stage 1: the letter, 26 ways.", "Stages 2–4: each digit, 10 ways each.", "Multiply: 26·10·10·10 = 26,000."] },
      gen: "multRule",
    },
    {
      id: "p1-sampling", title: "Ordered sampling: with and without replacement",
      teach: `Choosing k items from n, <b>in order</b>:
<br>• <b>With replacement</b> (items can repeat): n<sup>k</sup>. Each pick has all n options.
<br>• <b>Without replacement</b> (no repeats): n(n−1)(n−2)···(n−k+1) = n!/(n−k)!.
<br>• Arranging all n items: n! (read "n factorial", n·(n−1)···2·1; 0! = 1).
<br><br>Decide two things every time: does order matter, and can things repeat?`,
      example: { q: "8 runners. How many ways can gold, silver and bronze be awarded?", steps: ["Order matters (gold ≠ silver); no runner gets two medals: without replacement.", "8 choices for gold, then 7 for silver, then 6 for bronze.", "8·7·6 = 336."] },
      gen: "orderedSampling",
    },
    {
      id: "p1-binom", title: "Binomial coefficients: choosing a group",
      teach: `When <b>order doesn't matter</b>, the number of ways to choose k of n items is the binomial coefficient
<br><br><b>C(n, k) = n! / (k!(n−k)!)</b>, read "n choose k".
<br><br>Why: there are n!/(n−k)! ordered selections, and each unordered group appears k! times among them (once for each ordering). Divide.
<br><br>Useful facts: C(n,k) = C(n, n−k) (choosing who's in = choosing who's out); C(n,0) = C(n,n) = 1; C(n,1) = n.
<br><br>In the app you can type C(10,3) and factorials like 5! directly.`,
      example: { q: "How many 5-card poker hands are there from a 52-card deck?", steps: ["A hand is a set: order doesn't matter, no repeats.", "C(52,5) = 52·51·50·49·48 / 5! = 311,875,200 / 120.", "= 2,598,960."] },
      gen: "comb",
    },
    {
      id: "p1-hyper", title: "Counting for probabilities: committees and hands",
      teach: `Most naive-definition problems are: <b>favourable outcomes / all outcomes</b>, each counted with the rules so far. Count both in the same way (both ordered or both unordered).
<br><br>When the favourable outcomes are built in parts, multiply the parts. A committee with exactly j women and k−j men: choose the women, C(w, j), and independently the men, C(m, k−j). So
<br><br><b>P = C(w, j)·C(m, k−j) / C(w+m, k)</b>.
<br><br>This shape will return in Chapter 3 as the <i>hypergeometric distribution</i>.`,
      example: { q: "5-card hand. Probability of a full house (three of one rank, two of another)?", steps: ["Denominator: C(52,5) = 2,598,960 hands.", "Pick the rank for the three: 13 ways; choose 3 of its 4 suits: C(4,3) = 4. Pick a different rank for the pair: 12 ways; choose 2 of 4 suits: C(4,2) = 6.", "Favourable = 13·4·12·6 = 3,744. P = 3744 / 2,598,960 ≈ 0.00144."] },
      gen: "hyperCommittee",
    },
    {
      id: "p1-be", title: "Bose–Einstein: stars and bars",
      teach: `How many ways to put k <b>indistinguishable</b> items into n <b>distinguishable</b> boxes? Equivalently: choose k items from n types, with replacement, where order doesn't matter.
<br><br>Line up k stars and n−1 bars; the bars split the stars into n groups. ★★|★||★★★ means box 1 gets 2, box 2 gets 1, box 3 gets 0, box 4 gets 3. Every arrangement of the k + n − 1 symbols is one distribution, so the count is
<br><br><b>C(n + k − 1, k)</b> (= C(n + k − 1, n − 1)).
<br><br>If every box must get at least one, give each box one first, then distribute the remaining k − n.
<br><br>Warning: these arrangements are <i>not</i> equally likely when you actually throw balls at random, so don't use this count as the denominator of a naive probability for random tosses.`,
      example: { q: "How many solutions does x₁ + x₂ + x₃ = 5 have in non-negative integers?", steps: ["Five stars (units) into 3 boxes (variables).", "Arrangements of 5 stars and 2 bars: C(7,2).", "= 21."] },
      gen: "boseEinstein",
    },
    {
      id: "p1-compl", title: "Complements: “at least one”",
      teach: `<b>P(Aᶜ) = 1 − P(A)</b>, where Aᶜ ("not A") is everything outside A.
<br><br>This is the trick for "at least one": the opposite of "at least one" is "none", and "none" is usually easy to count.
<br><br>The birthday problem: with k people, P(all birthdays different) = 365·364···(365−k+1) / 365<sup>k</sup>. So P(at least one shared) = 1 − that. It passes 1/2 at just k = 23, because there are C(23,2) = 253 pairs of people, each a chance for a match.`,
      example: { q: "Flip a fair coin 10 times. P(at least one head)?", steps: ["Complement: no heads at all, i.e. all tails.", "P(all tails) = (1/2)^10 = 1/1024.", "P(at least one head) = 1 − 1/1024 = 1023/1024."] },
      gen: "complement",
    },
    {
      id: "p1-ie", title: "Inclusion–exclusion",
      teach: `For two events: <b>P(A ∪ B) = P(A) + P(B) − P(A ∩ B)</b>. Adding counts the overlap twice, so subtract it once.
<br><br>For three: P(A∪B∪C) = P(A)+P(B)+P(C) − P(A∩B) − P(A∩C) − P(B∩C) + P(A∩B∩C). The pattern alternates: add singles, subtract pairs, add triples...
<br><br>Famous application (de Montmort's matching problem): shuffle n cards labelled 1..n. P(at least one card lands in its own position) = 1 − 1/2! + 1/3! − ... → 1 − 1/e ≈ 0.632 as n grows.`,
      example: { q: "In a class, 60% take French, 50% take Spanish and 20% take both. What fraction takes at least one?", steps: ["A = French, B = Spanish.", "P(A∪B) = 0.6 + 0.5 − 0.2.", "= 0.9: 90% take at least one."] },
      gen: "inclExcl",
    },
  ],

  /* ======================= PROBABILITY 2: Conditional probability ======================= */
  prob2: [
    {
      id: "p2-cond", title: "Conditional probability",
      teach: `<b>P(A | B) = P(A ∩ B) / P(B)</b>, the probability of A <i>given</i> that B happened (needs P(B) > 0).
<br><br>Interpretation: learning B rules out every outcome not in B. The sample space shrinks to B, and we ask what fraction of B is also in A.
<br><br>P(A|B) and P(B|A) are different questions. P(Spanish speaker | lives in Madrid) is high; P(lives in Madrid | Spanish speaker) is low. Mixing them up is called the <i>prosecutor's fallacy</i>.`,
      example: { q: "Two fair dice. Given that the first die is a 4, what is P(sum ≥ 9)?", steps: ["Condition: first die = 4. New sample space: (4,1),(4,2),...,(4,6): 6 equally likely outcomes.", "Sum ≥ 9 needs second die ≥ 5: (4,5),(4,6). Two outcomes.", "P = 2/6 = 1/3."] },
      gen: "condDice",
    },
    {
      id: "p2-chain", title: "Multiplying conditional probabilities",
      teach: `Rearranging the definition: <b>P(A ∩ B) = P(B)·P(A | B) = P(A)·P(B | A)</b>.
<br><br>For a sequence: P(A₁ ∩ A₂ ∩ A₃) = P(A₁)·P(A₂|A₁)·P(A₃|A₁,A₂). Read it as "first this happens, then given that, this happens..."
<br><br>This is how you handle drawing without replacement: each draw changes what's left.`,
      example: { q: "Draw 3 cards. P(all three are aces)?", steps: ["P(1st ace) = 4/52.", "Given that, 3 aces remain among 51 cards: P(2nd ace | 1st ace) = 3/51. Then 2/50.", "Multiply: 4/52 · 3/51 · 2/50 = 24/132,600 ≈ 0.000181. (Check: C(4,3)/C(52,3) gives the same.)"] },
      gen: "urnTwo",
    },
    {
      id: "p2-ltp", title: "The law of total probability",
      teach: `If B₁, ..., Bₙ split the sample space into pieces (exactly one of them happens), then
<br><br><b>P(A) = P(A|B₁)P(B₁) + ... + P(A|Bₙ)P(Bₙ)</b>.
<br><br>Strategy: when P(A) is hard, ask "what would make it easy if I knew it?" Condition on that, solve each case, and take a weighted average.
<br><br>Think of it as a tree: first branch on which Bᵢ happens, then on A. Multiply along branches, add the branches that end in A.`,
      example: { q: "Box 1 has 3 red, 1 blue. Box 2 has 1 red, 3 blue. Pick a box by coin flip, then a ball. P(red)?", steps: ["Condition on the box: P(red | box 1) = 3/4, P(red | box 2) = 1/4. Each box has probability 1/2.", "P(red) = (3/4)(1/2) + (1/4)(1/2).", "= 1/2."] },
      gen: "totalProb",
    },
    {
      id: "p2-bayes", title: "Bayes' rule",
      teach: `<b>P(A | B) = P(B | A)·P(A) / P(B)</b>, and usually you compute P(B) with the law of total probability.
<br><br>Vocabulary: P(A) is the <i>prior</i> (before evidence), P(A|B) the <i>posterior</i> (after), P(B|A) the <i>likelihood</i>.
<br><br>The classic surprise: a 95%-accurate test for a disease that 1% of people have. Out of 10,000 people, 100 are sick and 95 of them test positive; 9,900 are healthy and 5% of them (495) test positive anyway. So P(sick | positive) = 95 / (95 + 495) ≈ 16%. When the condition is rare, false positives swamp true ones.
<br><br>Imagining a concrete population like this is the fastest way to get Bayes problems right.`,
      example: { q: "1% of emails are spam. A filter flags 99% of spam and 2% of legitimate emails. An email is flagged. P(spam)?", steps: ["Numerator: P(flag | spam)P(spam) = 0.99 · 0.01 = 0.0099.", "P(flag) = 0.0099 + P(flag | legit)P(legit) = 0.0099 + 0.02 · 0.99 = 0.0099 + 0.0198 = 0.0297.", "P(spam | flag) = 0.0099 / 0.0297 = 1/3."] },
      gen: "bayesTest",
    },
    {
      id: "p2-bayes2", title: "Bayes with several causes",
      teach: `Same rule, more causes: P(Bᵢ | A) = P(A | Bᵢ)P(Bᵢ) / Σⱼ P(A | Bⱼ)P(Bⱼ).
<br><br>The denominator is just the total probability of the evidence. The numerator picks out the one path through the tree you care about. "Of all the ways the evidence could have happened, what fraction went through cause i?"`,
      example: { q: "Box 1: 3 red, 1 blue. Box 2: 1 red, 3 blue. A box is chosen by coin flip and a red ball is drawn. P(it was box 1)?", steps: ["Path through box 1 and red: (1/2)(3/4) = 3/8. Path through box 2 and red: (1/2)(1/4) = 1/8.", "Total P(red) = 3/8 + 1/8 = 1/2.", "P(box 1 | red) = (3/8)/(1/2) = 3/4."] },
      gen: "bayesFactory",
    },
    {
      id: "p2-indep", title: "Independence",
      teach: `A and B are <b>independent</b> if P(A ∩ B) = P(A)P(B). Equivalently (when P(B) > 0), P(A | B) = P(A): knowing B tells you nothing about A.
<br><br>Independence is <i>not</i> the same as disjoint (mutually exclusive). Disjoint events with positive probability are strongly <i>dependent</i>: if one happens, the other certainly doesn't.
<br><br>If A and B are independent, so are A and Bᶜ, Aᶜ and B, and Aᶜ and Bᶜ.
<br><br>For three or more events, independence requires every sub-collection to multiply: pairwise independence isn't enough.`,
      example: { q: "A coin is flipped and a die is rolled. P(heads or a 6)?", steps: ["Independent: P(H ∩ 6) = (1/2)(1/6) = 1/12.", "Inclusion–exclusion: 1/2 + 1/6 − 1/12.", "= 7/12."] },
      gen: "indep",
    },
    {
      id: "p2-paradox", title: "Classic traps: Monty Hall and friends",
      teach: `<b>Monty Hall.</b> A car is behind one of 3 doors. You pick door 1. The host, who knows where the car is and always opens a goat door you didn't pick, opens door 3. Should you switch to door 2? Yes: switching wins with probability 2/3. Your first pick is right 1/3 of the time and the host's action can't change that; the remaining 2/3 collapses onto the one unopened door.
<br><br><b>Simpson's paradox.</b> A treatment can be better within every subgroup yet look worse overall, if the groups are of different sizes and difficulty. Aggregation can reverse a comparison.
<br><br><b>Prosecutor's fallacy.</b> Confusing P(evidence | innocent), which may be tiny, with P(innocent | evidence), which depends on the prior.`,
      example: { q: "Why does the host's knowledge matter in Monty Hall?", steps: ["If the host opened a random door and it happened to show a goat, switching would win only 1/2 of the time.", "Because he always avoids the car, opening a door gives you information about the doors you didn't pick.", "Condition on what actually happened, including how it happened."] },
      problems: [
        mcq("Monty Hall: you pick door 1, the host (who always shows a goat) opens door 3. Probability of winning if you switch?", ["1/3", "1/2", "2/3", "1"], 2, "2/3. You were right initially with probability 1/3; otherwise (2/3) the car is behind the one door the host left closed."),
        mcq("Same game but with 100 doors. You pick one; the host opens 98 goat doors. Probability of winning if you switch?", ["1/100", "1/2", "99/100", "98/100"], 2, "99/100. Your first pick is right 1/100 of the time; otherwise the car must be behind the single remaining door."),
        mcq("A DNA match occurs by chance in 1 in a million innocent people. A suspect matches. Which statement is justified?", ["P(innocent | match) = 1 in a million", "P(match | innocent) = 1 in a million", "The suspect is guilty with probability 999,999/1,000,000", "Both A and C"], 1, "Only P(match | innocent) is given. P(innocent | match) depends on how many people could have been the source (the prior): in a city of 10 million, about 10 innocent people would match."),
        mcq("Events A and B have P(A) = 0.3, P(B) = 0.4 and are disjoint. Are they independent?", ["Yes", "No"], 1, "No. Disjoint means P(A∩B) = 0, but independence would need P(A∩B) = 0.12."),
        mcq("Hospital A has a higher survival rate than B for both mild and severe cases, yet a lower overall rate. How?", ["Impossible; it's an arithmetic error", "A treats a much larger share of severe cases", "B lies about its data", "Survival rates can't be compared"], 1, "Simpson's paradox: if A takes mostly severe (low-survival) cases, its overall average is dragged down even though it does better in each group."),
        mcq("You learn that a family has two children and at least one is a girl. Probability both are girls (each child independently girl/boy with 1/2)?", ["1/2", "1/3", "1/4", "2/3"], 1, "Sample space given at least one girl: GG, GB, BG (BB ruled out). One of three: 1/3."),
      ],
    },
  ],

  /* ======================= PROBABILITY 3: Random variables ======================= */
  prob3: [
    {
      id: "p3-rv", title: "Random variables and PMFs",
      teach: `A <b>random variable</b> X is a function that assigns a number to each outcome. Rolling two dice, X = the sum. Flipping 10 coins, X = the number of heads. The randomness comes from the experiment; X just reports a number about it.
<br><br>For a <b>discrete</b> X (values you can list), the <b>PMF</b> is p(x) = P(X = x). A valid PMF is non-negative and its values sum to 1 over all possible x.
<br><br>Events about X are sets of values: P(X ≥ 2) = Σ over x ≥ 2 of P(X = x).
<br><br>Don't confuse X (the random variable) with x (a number it might take), or X with its distribution: two different random variables can have the same distribution.`,
      example: { q: "Flip a fair coin twice; X = number of heads. Find the PMF.", steps: ["Outcomes: HH, HT, TH, TT, each 1/4.", "X = 2 for HH; X = 1 for HT and TH; X = 0 for TT.", "P(X=0) = 1/4, P(X=1) = 1/2, P(X=2) = 1/4. Sum = 1. ✓"] },
      gen: "pmfMissing",
    },
    {
      id: "p3-cdf", title: "The CDF",
      teach: `The <b>cumulative distribution function</b> is <b>F(x) = P(X ≤ x)</b>, defined for every real x, not just the values X takes.
<br><br>For a discrete X it's a staircase: flat between possible values, jumping up by P(X = x) at each one. It rises from 0 (far left) to 1 (far right) and never decreases.
<br><br>Getting probabilities from it: P(a < X ≤ b) = F(b) − F(a).`,
      example: { q: "X = number of heads in 2 fair flips (PMF 1/4, 1/2, 1/4). Find F(1.5) and P(0 < X ≤ 2).", steps: ["F(1.5) = P(X ≤ 1.5) = P(X=0) + P(X=1) = 3/4.", "F(2) = 1 and F(0) = 1/4.", "P(0 < X ≤ 2) = F(2) − F(0) = 3/4."] },
      gen: "cdf",
    },
    {
      id: "p3-binom", title: "Bernoulli and Binomial",
      teach: `<b>Bernoulli(p)</b>: X = 1 with probability p (success), 0 otherwise. The building block.
<br><br><b>Binomial(n, p)</b>: the number of successes in n <i>independent</i> Bernoulli(p) trials. PMF:
<br><br><b>P(X = k) = C(n, k) p<sup>k</sup> (1−p)<sup>n−k</sup></b>, for k = 0, 1, ..., n.
<br><br>Why: any particular sequence with k successes has probability p<sup>k</sup>(1−p)<sup>n−k</sup> (independence lets you multiply), and C(n, k) sequences choose which trials succeed.
<br><br>Check the conditions: fixed n, independent trials, same p each time.`,
      example: { q: "X ~ Bin(5, 0.3). Find P(X = 2).", steps: ["C(5,2) = 10.", "0.3² · 0.7³ = 0.09 · 0.343 = 0.03087.", "P(X = 2) = 10 · 0.03087 = 0.3087."] },
      gen: "binom",
    },
    {
      id: "p3-hyper", title: "Hypergeometric",
      teach: `An urn has w white and b black balls. Draw n <b>without replacement</b>. X = number of white balls drawn. Then X ~ <b>HGeom(w, b, n)</b>:
<br><br><b>P(X = k) = C(w, k)·C(b, n−k) / C(w+b, n)</b>.
<br><br>It's the committee formula from Chapter 1. Same story as the Binomial except the draws are dependent (each draw changes the urn). If the urn is huge compared to n, the difference vanishes and HGeom ≈ Bin(n, w/(w+b)).`,
      example: { q: "A 5-card hand. P(exactly 2 aces)?", steps: ["Aces are 'white' (w = 4), the other 48 cards 'black'.", "C(4,2)·C(48,3) / C(52,5) = 6 · 17,296 / 2,598,960.", "≈ 0.0399."] },
      gen: "hyper",
    },
    {
      id: "p3-which", title: "Which distribution is it?",
      teach: `Recognising the story is half of every problem.
<br>• One trial, success or failure → <b>Bernoulli</b>.
<br>• Count successes in a fixed number of independent, identical trials (with replacement) → <b>Binomial</b>.
<br>• Count special items in a sample drawn <i>without</i> replacement from a finite population → <b>Hypergeometric</b>.
<br>• None of these: write the PMF directly.
<br><br>A function of a random variable is a random variable too: if X ~ Bin(n, p), then n − X (the failures) ~ Bin(n, 1−p).`,
      example: { q: "You draw 10 cards with replacement and count hearts. Distribution?", steps: ["Fixed number of draws: 10.", "With replacement: each draw independent, P(heart) = 1/4 every time.", "Bin(10, 1/4)."] },
      problems: [
        mcq("Count the number of 6s in 20 rolls of a fair die.", ["Bernoulli", "Binomial", "Hypergeometric", "None of these"], 1, "Bin(20, 1/6): fixed number of independent trials with the same success probability."),
        mcq("A lake has 50 tagged and 450 untagged fish. You catch 20 different fish. Count tagged ones.", ["Bernoulli", "Binomial", "Hypergeometric", "None of these"], 2, "HGeom(50, 450, 20): sampling without replacement from a finite population."),
        mcq("Whether a single free throw goes in.", ["Bernoulli", "Binomial", "Hypergeometric", "None of these"], 0, "One trial, success or failure: Bernoulli(p)."),
        mcq("Flip a coin until the first head; X = number of flips.", ["Bernoulli", "Binomial", "Hypergeometric", "None of these"], 3, "Not a fixed number of trials, so none of these. (It's the Geometric/First Success distribution, Chapter 4.)"),
        mcq("X ~ Bin(12, 0.3) counts successes. What is the distribution of 12 − X?", ["Bin(12, 0.3)", "Bin(12, 0.7)", "HGeom(12, 0.3)", "Not Binomial"], 1, "12 − X counts failures, and each trial fails with probability 0.7: Bin(12, 0.7)."),
        mcq("Draw 5 cards (no replacement); count aces. Draw 5 cards (with replacement); count aces. Which statement is right?", ["Both Binomial", "First HGeom, second Bin", "First Bin, second HGeom", "Both HGeom"], 1, "Without replacement → HGeom(4, 48, 5). With replacement → Bin(5, 1/13)."),
      ],
    },
  ],

  /* ======================= LINGUISTICS 1: Morphology I ======================= */
  ling1: [
    {
      id: "l1-desc", title: "What linguistics studies",
      teach: `Linguistics is the scientific study of language: what speakers actually know and do, not what style guides say they should do.
<br><br><b>Descriptive</b> rules describe how people really speak ("in English, adjectives come before nouns"). <b>Prescriptive</b> rules tell people how they ought to speak ("don't split infinitives", "don't end a sentence with a preposition"). Linguists study the first kind.
<br><br>Every native speaker has rich unconscious knowledge, a <b>mental grammar</b>. You know "blick" could be an English word but "bnick" couldn't, and that "Who did you see Mary and?" is impossible, though nobody taught you either. The job is to make that knowledge explicit.`,
      example: { q: "“Ain't nobody got time for that.” Is this ungrammatical?", steps: ["Prescriptively it breaks school rules (\"ain't\", double negative).", "Descriptively it follows the consistent grammar of varieties like African American English, where negative concord (multiple negatives = one negation) is regular, as in French \"je ne vois personne\" or Russian \"никто ничего не знает\".", "So it's grammatical in its variety: systematic, not random error."] },
      problems: [
        mcq("“Never end a sentence with a preposition.” This rule is:", ["Descriptive", "Prescriptive"], 1, "Prescriptive: it tells people how to speak, and plenty of fluent speakers ignore it (\"Who are you talking to?\")."),
        mcq("“In English, articles come before the noun they go with.” This rule is:", ["Descriptive", "Prescriptive"], 0, "Descriptive: it states what speakers actually do. Nobody has to be taught not to say \"dog the\"."),
        mcq("A linguist finds that speakers in a region say “I might could go.” What should she conclude?", ["They are making errors", "Their grammar allows double modals", "They are not native speakers", "The data should be ignored"], 1, "Double modals are a systematic feature of some Southern US and Scottish varieties. Linguists describe the grammar that produces them."),
        mcq("Which of these is evidence of a mental grammar?", ["Knowing the spelling of 'colour'", "Judging 'blick' a possible word but 'bnick' impossible", "Memorising a dictionary definition", "Using formal register at work"], 1, "Nobody taught you that English words can't start with 'bn'. You know it from your internal grammar of English sounds."),
        mcq("“Don't say 'less people', say 'fewer people'.” This is:", ["Descriptive", "Prescriptive"], 1, "Prescriptive. Descriptively, many speakers use 'less' with count nouns."),
      ],
    },
    {
      id: "l1-morph", title: "Morphemes",
      teach: `A <b>morpheme</b> is the smallest unit of language with its own meaning or grammatical function.
<br><br>"unhappiness" = <b>un</b> (not) + <b>happy</b> + <b>ness</b> (state of): 3 morphemes. "dogs" = dog + s (plural): 2. "cat" = 1.
<br><br>Morphemes aren't syllables: "elephant" has 3 syllables but 1 morpheme; "dogs" has 1 syllable but 2 morphemes. And they aren't letters: "-ed" in "walked" is one morpheme.
<br><br>To find them, look for pieces that recur with the same meaning in other words: re- in redo/rewrite/reconsider; -er in teacher/singer/runner.`,
      example: { q: "How many morphemes are in “reconsiderations”?", steps: ["re- (again): it recurs in redo, rewrite.", "consider (the root), -ation (turns a verb into a noun: creation, invitation), -s (plural).", "re + consider + ation + s = 4 morphemes."] },
      problems: [
        num("How many morphemes in “unhappiness”?", 3, "un + happy + ness."),
        num("How many morphemes in “books”?", 2, "book + s (plural)."),
        num("How many morphemes in “elephant”?", 1, "One morpheme. Three syllables, but no part means anything on its own."),
        num("How many morphemes in “carelessness”?", 3, "care + less + ness."),
        num("How many morphemes in “rewritten”?", 3, "re + writ(e) + en (past participle)."),
        num("How many morphemes in “unbreakable”?", 3, "un + break + able."),
        num("How many morphemes in “walked”?", 2, "walk + ed (past)."),
        num("How many morphemes in “nationalization”?", 4, "nation + al + iz(e) + ation."),
        num("How many morphemes in “pumpkin”?", 1, "One. “pump” and “kin” are not meaningful parts of pumpkin."),
      ],
    },
    {
      id: "l1-free", title: "Free and bound morphemes",
      teach: `A <b>free</b> morpheme can stand alone as a word: happy, dog, care, the.
<br>A <b>bound</b> morpheme must attach to something: un-, -ness, -s, re-, -able.
<br><br>Most roots in English are free, but some are bound: the "-ceive" in receive/deceive/perceive, or "cran-" in cranberry (a <i>cranberry morpheme</i>: it appears in only one word and has no meaning of its own).
<br><br>Affixes (prefixes, suffixes) are always bound.`,
      example: { q: "Classify the morphemes in “rereadable”.", steps: ["re- : bound (prefix).", "read : free (it's a word).", "-able : bound (suffix). So 1 free, 2 bound."] },
      problems: [
        mcq("In “kindness”, which morpheme is bound?", ["kind", "-ness", "both", "neither"], 1, "-ness can't stand alone; kind can."),
        mcq("In “receive”, is “-ceive” free or bound?", ["Free", "Bound"], 1, "Bound root: it never appears alone, only in receive, deceive, conceive, perceive."),
        mcq("Which word contains only free morphemes?", ["unkind", "blackboard", "walking", "redo"], 1, "black + board: two free morphemes (a compound)."),
        mcq("In “cranberry”, “cran-” is:", ["A free morpheme", "A bound morpheme with no independent meaning", "Not a morpheme", "A suffix"], 1, "A cranberry morpheme: bound, found only in this word, but still contrasting it with blueberry, blackberry."),
        num("How many bound morphemes in “unhelpfulness”?", 3, "un-, -ful, -ness are bound; help is free."),
      ],
    },
    {
      id: "l1-deriv", title: "Derivation vs. inflection",
      teach: `<b>Inflection</b> marks grammatical information without making a new word: number (-s), tense (-ed), comparison (-er, -est). "walk / walks / walked / walking" are forms of one word (one <i>lexeme</i>).
<br><br><b>Derivation</b> makes a new word, often changing the word class or meaning: teach (verb) → teacher (noun); happy → unhappy; modern → modernize.
<br><br>English has only 8 inflectional suffixes: plural -s, possessive -'s, 3rd-person singular -s, past -ed, progressive -ing, past participle -en/-ed, comparative -er, superlative -est. Everything else is derivational.
<br><br>Tests: derivation goes inside inflection (teach-er-s, never *teach-s-er); inflection applies to almost every word of its class; derivation is pickier (happiness, but not *goodness-ity).
<br><br>Same form, different morpheme: -er in "taller" (comparative, inflection) vs. "teacher" (agent noun, derivation).`,
      example: { q: "Classify each suffix in “modernizations”.", steps: ["-ize: adjective → verb (modernize). Derivational.", "-ation: verb → noun. Derivational.", "-s: plural. Inflectional, and outermost, as expected."] },
      problems: [
        mcq("-er in “taller”", ["Inflectional", "Derivational"], 0, "Comparative -er: one of English's 8 inflectional suffixes."),
        mcq("-er in “singer”", ["Inflectional", "Derivational"], 1, "Agent -er makes a new noun from a verb: derivational."),
        mcq("-ing in “She is singing”", ["Inflectional", "Derivational"], 0, "Progressive -ing: inflectional."),
        mcq("-ness in “sadness”", ["Inflectional", "Derivational"], 1, "Adjective → noun: derivational."),
        mcq("-s in “She walks”", ["Inflectional", "Derivational"], 0, "3rd-person singular present: inflectional."),
        mcq("un- in “undo”", ["Inflectional", "Derivational"], 1, "English prefixes are all derivational."),
        mcq("Which order is possible in English?", ["teach-s-er", "teach-er-s", "both", "neither"], 1, "Derivation (-er) inside, inflection (-s) outside."),
        mcq("Russian книга/книги/книгу (kniga/knigi/knigu) differ in:", ["Derivation", "Inflection"], 1, "Case and number endings: inflection. Same word, different grammatical forms."),
      ],
    },
    {
      id: "l1-affix", title: "Kinds of affixes",
      teach: `<b>Prefix</b>: before the root (un-happy). <b>Suffix</b>: after it (happi-ness).
<br><b>Infix</b>: inside the root. Tagalog: sulat 'write' → s<b>um</b>ulat 'wrote'. English only has a playful one: abso-<b>bloody</b>-lutely.
<br><b>Circumfix</b>: two parts around the root, acting together. German past participle: <b>ge</b>-spiel-<b>t</b> 'played'.
<br><br>Some morphology isn't an affix at all: <b>internal change</b> (sing/sang, foot/feet), <b>suppletion</b> (go/went, good/better: a totally different form), <b>reduplication</b> (copying part of the word: Indonesian orang 'person' → orang-orang 'people').`,
      example: { q: "Tagalog: bili 'buy' → bumili 'bought'; kain 'eat' → kumain 'ate'. What kind of affix marks the past here?", steps: ["Compare: b-ili → b-um-ili; k-ain → k-um-ain.", "-um- appears after the first consonant, inside the root.", "An infix."] },
      problems: [
        mcq("German ge-sag-t ('said'). The ge-...-t is a:", ["Prefix", "Suffix", "Infix", "Circumfix"], 3, "Two pieces that surround the root and work together: a circumfix."),
        mcq("Tagalog: tawag 'call' → tumawag. The -um- is a:", ["Prefix", "Suffix", "Infix", "Circumfix"], 2, "Inserted after the first consonant, inside the root: infix."),
        mcq("go → went is an example of:", ["Infixation", "Suppletion", "Reduplication", "Circumfixation"], 1, "An entirely different form for a grammatical category: suppletion."),
        mcq("Indonesian anak 'child' → anak-anak 'children' shows:", ["Suppletion", "Reduplication", "Infixation", "Internal change"], 1, "The whole word is copied to mark plural: full reduplication."),
        mcq("mouse → mice shows:", ["Internal change", "Suffixation", "Suppletion", "Reduplication"], 0, "The vowel changes inside the root: internal change (ablaut/umlaut)."),
      ],
    },
    {
      id: "l1-prod", title: "Productivity",
      teach: `A morphological process is <b>productive</b> if speakers freely use it on new words. -ness is very productive: you'd understand "googleable-ness" instantly. -th (warm → warmth, true → truth) is <b>unproductive</b>: nobody coins "coolth" seriously.
<br><br>Productivity is a matter of degree. Evidence: new coinages ("to google, googled, googling"), how children overgeneralize ("goed", "foots": they've learned the productive rule before the exceptions), and how speakers treat nonsense words (the <i>wug test</i>: "This is a wug. Now there are two ___." Children say "wugs" with [z]).`,
      example: { q: "A child says “I goed to the park.” What does this show?", steps: ["The child never heard “goed” from adults.", "She has extracted the productive past-tense rule (add -ed) and applied it to an irregular verb.", "Productive rules are learned as rules, not memorised word by word."] },
      problems: [
        mcq("Which suffix is most productive in modern English?", ["-th (warmth)", "-ness (happiness)", "-en (oxen)", "-ric (bishopric)"], 1, "-ness attaches to almost any adjective, including new ones."),
        mcq("“This is a wug. Now there are two wugs.” The wug test shows:", ["Children memorise plurals", "Children apply productive rules to new words", "Wug is an English word", "Plural is irregular"], 1, "Berko's wug test: children inflect nonsense words they've never heard, so they have a rule."),
        mcq("“Unfriend”, coined in the 2000s, shows that un- is:", ["Productive", "Unproductive"], 0, "New coinages with un- are easily understood: productive."),
        mcq("A child says “two foots”. This is evidence that:", ["The child has a learning disorder", "The child overgeneralizes the productive plural rule", "English plurals are random", "Foots is correct"], 1, "Overgeneralization is a normal stage: the regular rule is learned and briefly applied everywhere."),
      ],
    },
  ],

  /* ======================= LINGUISTICS 2: Morphology II ======================= */
  ling2: [
    {
      id: "l2-type", title: "Morphological types of languages",
      teach: `Languages differ in how much they pack into a word.
<br>• <b>Isolating</b> (analytic): mostly one morpheme per word; grammar via word order and separate particles. Mandarin: 我 吃 了 (wǒ chī le) 'I eat PERFECTIVE' = 'I ate'.
<br>• <b>Agglutinative</b>: many morphemes per word, each with one clear meaning, glued in a row. Turkish ev-ler-im-de 'house-PL-my-in' = 'in my houses'. Kazakh works the same way: үй-лер-ім-де (üy-ler-im-de).
<br>• <b>Fusional</b>: one affix carries several meanings at once. Russian книг-<b>ой</b> (knig-oy): -oy = feminine + singular + instrumental, all in one ending.
<br>• <b>Polysynthetic</b>: whole sentences in one word. Inuktitut, Mohawk.
<br><br>These are tendencies along a scale, not boxes. English is mostly isolating with some fusional bits (-s on "walks" = 3rd person + singular + present).`,
      example: { q: "Latin amō 'I love', amās 'you love', amat 's/he loves'. What type is this?", steps: ["The endings -ō, -ās, -at each express person AND number AND tense AND mood at once.", "You can't split -ō into a 'first person' piece and a 'singular' piece.", "Fusional."] },
      problems: [
        mcq("Turkish ev-ler-im-iz-de 'in our houses': each suffix has one meaning (PL, POSS, 1PL, LOC). This is:", ["Isolating", "Agglutinative", "Fusional", "Polysynthetic"], 1, "One meaning per affix, stacked in a row: agglutinative."),
        mcq("Vietnamese: “tôi sẽ đi” 'I FUTURE go'. No word changes form. This is:", ["Isolating", "Agglutinative", "Fusional", "Polysynthetic"], 0, "Grammar via separate words and order: isolating."),
        mcq("Russian стол-ам (stol-am) 'to the tables': -am marks dative AND plural together. This is:", ["Isolating", "Agglutinative", "Fusional", "Polysynthetic"], 2, "One ending, several meanings fused: fusional."),
        mcq("Mohawk can express 'He made the thing that one puts on one's body ugly for her' in one word. This is:", ["Isolating", "Agglutinative", "Fusional", "Polysynthetic"], 3, "Whole clauses inside a word: polysynthetic."),
        mcq("Kazakh кітап-тар-ым (kitap-tar-ım) 'my books': kitap 'book', -tar plural, -ım 'my'. This is:", ["Isolating", "Agglutinative", "Fusional", "Polysynthetic"], 1, "Separate suffix per meaning: agglutinative, like Turkish (both are Turkic)."),
        mcq("Mandarin is a classic example of which type?", ["Isolating", "Agglutinative", "Fusional", "Polysynthetic"], 0, "Mostly one morpheme per word; aspect and plurality via particles: isolating."),
      ],
    },
    {
      id: "l2-tree", title: "Word structure is hierarchical",
      teach: `Morphemes aren't just strung in a row; they combine in steps, like a tree. Affixes are picky about what they attach to:
<br>• un- (meaning 'not') attaches to adjectives: unhappy, unkind.
<br>• -ness attaches to adjectives: happiness.
<br>• -able attaches to verbs: readable.
<br><br>So "unhappiness" must be [[un + happy] + ness]: un- first (to the adjective happy), then -ness.
<br><br>Different trees can give different meanings. "unlockable":
<br>• [un + [lock + able]] = 'not able to be locked'
<br>• [[un + lock] + able] = 'able to be unlocked' (a second un- that attaches to verbs: undo, untie).
<br><br>This is <b>structural ambiguity</b>, the same phenomenon you'll meet in syntax.`,
      example: { q: "Bracket “reusable”.", steps: ["re- attaches to verbs (redo, rewrite). -able attaches to verbs and makes adjectives.", "If -able attached first, we'd get 'usable' (adjective), and re- can't attach to adjectives.", "So [[re + use] + able]: 'able to be used again'."] },
      problems: [
        mcq("Which bracketing is right for “unhappiness”?", ["[un [happy ness]]", "[[un happy] ness]"], 1, "un- attaches to adjectives (happy), not nouns (happiness): first unhappy, then -ness."),
        mcq("“Untieable” meaning 'can be untied' has the structure:", ["[un [tie able]]", "[[un tie] able]"], 1, "First untie (verb), then -able."),
        mcq("“Unlockable” meaning 'cannot be locked' has the structure:", ["[un [lock able]]", "[[un lock] able]"], 0, "First lockable (adjective), then un- ('not')."),
        mcq("Why is *“happinessun” impossible?", ["un- is a prefix, and its attachment is fixed before the root", "-ness can't attach to happy", "It has too many morphemes", "It's possible in some dialects"], 0, "un- is a prefix: it goes before what it attaches to."),
        mcq("“Nationalization”: which step comes first?", ["nation + al", "al + ize", "ize + ation", "nation + ation"], 0, "nation → national → nationalize → nationalization: each suffix attaches to the output of the previous step."),
      ],
    },
    {
      id: "l2-allo-pl", title: "Allomorphs: the English plural",
      teach: `One morpheme can have several pronunciations, called <b>allomorphs</b>. The English plural morpheme has three, chosen by the last <i>sound</i> (not letter) of the noun:
<br>• <b>[ɪz]</b> after sibilants (s, z, ʃ, ʒ, tʃ, dʒ): buses, roses, wishes, garages, churches, judges.
<br>• <b>[s]</b> after other voiceless sounds (p, t, k, f, θ): cats, books, laughs, myths.
<br>• <b>[z]</b> after other voiced sounds, including all vowels: dogs, cars, bees, pens.
<br><br>The choice is predictable from the sound environment, so we say the allomorphs are <b>phonologically conditioned</b>. Speakers know this rule unconsciously; it's what the wug test shows.`,
      example: { q: "How is the plural pronounced in “laughs”?", steps: ["Spelled -gh, but the last sound is [f].", "[f] isn't a sibilant; it's voiceless.", "So [s]: [læfs]."] },
      gen: "plural",
    },
    {
      id: "l2-allo-past", title: "Allomorphs: the English past tense",
      teach: `The regular past tense -ed works the same way:
<br>• <b>[ɪd]</b> after t and d: wanted, needed.
<br>• <b>[t]</b> after other voiceless sounds: walked, kissed, laughed, wished.
<br>• <b>[d]</b> after other voiced sounds: played, hugged, called, loved.
<br><br>Pattern behind both rules: insert a vowel when the suffix would be too similar to the stem's last sound (s after s, t after t), otherwise match the voicing of the last sound. This is a phonological rule, which is where unit 4 is heading.`,
      example: { q: "How is the past ending pronounced in “fixed”?", steps: ["“fix” ends in the sounds [ks]; the last sound is [s].", "[s] is voiceless and not t or d.", "So [t]: [fɪkst]."] },
      gen: "past",
    },
    {
      id: "l2-harmony", title: "Analyzing data: Turkish vowel harmony",
      teach: `Linguists often work out morphology from unfamiliar data. Turkish plural has two allomorphs, -<b>ler</b> and -<b>lar</b>:
<br>ev → evler 'houses', gün → günler 'days', kitap → kitaplar 'books', okul → okullar 'schools'.
<br><br>The rule: the suffix vowel agrees in frontness with the last vowel of the stem. Front vowels e, i, ö, ü → -ler. Back vowels a, ı, o, u → -lar. This is <b>vowel harmony</b>, found across Turkic languages (Kazakh too) and in Finnish and Hungarian.
<br><br>Method for any data problem: line up forms, find the recurring pieces, list where each allomorph appears, and look for what the environments have in common.`,
      example: { q: "Turkish: el 'hand' → eller; at 'horse' → atlar. Predict the plural of yol 'road'.", steps: ["Last vowel of yol: o.", "o is a back vowel.", "Back → -lar: yollar."] },
      gen: "turkish",
    },
    {
      id: "l2-compound", title: "Compounds",
      teach: `A <b>compound</b> joins two or more free morphemes into one word: blackboard, doghouse, ice cream.
<br><br>In English the <b>head</b> is usually on the right: it determines the category and the basic meaning. A doghouse is a kind of house; a housedog is a kind of dog.
<br><br>Compounds vs. phrases: a <i>blackbird</i> (compound, stress on BLACK) is a species of bird, which may not even be black. A <i>black bird</i> (phrase, stress on BIRD) is any bird that is black.
<br><br>Meaning of compounds isn't fully predictable: a firetruck carries no fire, a fireman isn't made of fire.`,
      example: { q: "What is a “boathouse”, and what is a “houseboat”?", steps: ["Head on the right.", "A boathouse is a house (for boats).", "A houseboat is a boat (that you live in)."] },
      problems: [
        mcq("In English, “sunflower” is a kind of:", ["sun", "flower"], 1, "The right-hand element is the head."),
        mcq("A “greenhouse” (stress on GREEN) is:", ["Any house painted green", "A glass building for plants"], 1, "Compound stress on the first element: a specific concept, not 'a house that is green'."),
        mcq("Which is a compound?", ["a black BIRD", "a BLACKbird", "both", "neither"], 1, "Compound stress (first element) and a lexicalized meaning: blackbird."),
        mcq("“Firetruck”: what does this show about compounds?", ["Meaning is fully predictable from parts", "Meaning isn't fully predictable from parts", "The head is on the left", "It isn't a compound"], 1, "A firetruck fights fires; you need to know the convention."),
      ],
    },
  ],

  /* ======================= LINGUISTICS 3: Phonetics ======================= */
  ling3: [
    {
      id: "l3-ipa", title: "Why the IPA",
      teach: `English spelling is a poor guide to sound: "though, through, tough, cough" share -ough and none rhyme; "c" is [k] in cat and [s] in city. Linguists use the <b>International Phonetic Alphabet</b> (IPA): one symbol per sound, the same in every language.
<br><br>Square brackets mark pronunciation: cat = [kæt], ship = [ʃɪp], think = [θɪŋk], this = [ðɪs].
<br><br>Consonants are described by three properties:
<br>1. <b>Voicing</b>: do the vocal folds vibrate? [z] buzzes, [s] doesn't. Hand on your throat to feel it.
<br>2. <b>Place</b>: where the airflow is blocked.
<br>3. <b>Manner</b>: how it's blocked.
<br><br>Voiceless/voiced pairs: p/b, t/d, k/g, f/v, θ/ð, s/z, ʃ/ʒ, tʃ/dʒ.`,
      example: { q: "Is [v] voiced?", steps: ["Say “vvvv” with a hand on your throat; then “ffff”.", "[v] buzzes, [f] doesn't; otherwise they're made the same way.", "[v] is voiced; [f] is its voiceless partner."] },
      gen: "consonantVoicing",
    },
    {
      id: "l3-place", title: "Place of articulation",
      teach: `From the lips back:
<br>• <b>Bilabial</b> (both lips): p, b, m.
<br>• <b>Labiodental</b> (lower lip + upper teeth): f, v.
<br>• <b>Dental</b> (tongue tip at the teeth): θ (think), ð (this).
<br>• <b>Alveolar</b> (tongue tip at the ridge behind the teeth): t, d, s, z, n, l, ɹ.
<br>• <b>Postalveolar</b> (just behind that ridge): ʃ (ship), ʒ (measure), tʃ (church), dʒ (judge). Russian ш, ж are close to these.
<br>• <b>Palatal</b> (tongue body at the hard palate): j (yes).
<br>• <b>Velar</b> (back of the tongue at the soft palate): k, g, ŋ (sing). Russian х [x] is a velar fricative.
<br>• <b>Glottal</b> (in the larynx): h.`,
      example: { q: "Place of articulation of [ŋ], the last sound of “sing”?", steps: ["Say “sing” and hold the end.", "The back of your tongue is pressed against the soft palate, as for [k] and [g].", "Velar."] },
      gen: "consonantPlace",
    },
    {
      id: "l3-manner", title: "Manner of articulation",
      teach: `• <b>Stop</b> (plosive): complete closure, then release: p b t d k g.
<br>• <b>Fricative</b>: narrow gap, turbulent hissing: f v θ ð s z ʃ ʒ h.
<br>• <b>Affricate</b>: a stop released into a fricative: tʃ (church), dʒ (judge). Russian ч and ц [ts] are affricates.
<br>• <b>Nasal</b>: closure in the mouth, air out through the nose: m n ŋ.
<br>• <b>Approximant</b>: articulators close, but not enough for friction: ɹ (red), j (yes), w. The <b>lateral approximant</b> l lets air flow around the sides of the tongue.
<br><br>Full description = voicing + place + manner: [b] is a voiced bilabial stop; [ʃ] a voiceless postalveolar fricative.`,
      example: { q: "Describe [dʒ], as in “judge”.", steps: ["Voicing: it buzzes, so voiced.", "Place: tongue just behind the alveolar ridge, so postalveolar.", "Manner: a stop [d] released into a fricative [ʒ], so an affricate. Voiced postalveolar affricate."] },
      gen: "consonantManner",
    },
    {
      id: "l3-symbol", title: "From description to symbol",
      teach: `Now run it backwards: given a description, find the symbol. Build it in steps: place narrows it to a column, manner to a row, voicing picks one of the pair.
<br><br>The consonant chart is organized exactly this way: places across the top, manners down the side, voiceless on the left of each cell and voiced on the right. Memorizing the English part of the chart is a one-afternoon job, and it pays off for every language you learn afterwards: you'll be able to read pronunciations in any dictionary.`,
      example: { q: "Which symbol is the voiced dental fricative?", steps: ["Dental fricatives: θ and ð.", "Voiced one of the pair: ð.", "As in “this”, “mother”."] },
      gen: "consonantSymbol",
    },
    {
      id: "l3-vowel", title: "Vowels",
      teach: `Vowels have no blockage, so they're described by the tongue and lips:
<br>• <b>Height</b>: how high the tongue is (high [i] beat, low [æ] bat).
<br>• <b>Backness</b>: front [i] vs. back [u].
<br>• <b>Rounding</b>: lips rounded [u] or spread [i].
<br><br>Key English vowels: [i] beat, [ɪ] bit, [ɛ] bet, [æ] bat (front); [u] boot, [ʊ] book, [ɑ] father (back); [ə] (schwa) the unstressed vowel in "sofa", "about" (central); [ʌ] but.
<br><br>Say "beat, bit, bet, bat" and feel your jaw drop: the tongue lowers step by step. Russian ы [ɨ] is a high central unrounded vowel, a sound English lacks.`,
      example: { q: "Describe [u] as in “boot”.", steps: ["Tongue high in the mouth: high.", "Tongue pulled back: back.", "Lips rounded: rounded. High back rounded vowel."] },
      gen: "vowel",
    },
    {
      id: "l3-transcribe", title: "Transcribing English",
      teach: `Transcription means writing what you hear, ignoring spelling. Common traps:
<br>• "th" is two different sounds: [θ] in think, [ð] in this.
<br>• "ng" at the end of a word is one sound, [ŋ]: sing = [sɪŋ].
<br>• Silent letters vanish: knight = [naɪt].
<br>• "ph" is [f]; "c" is [k] or [s]; "x" is [ks].
<br>• "s" between vowels is often [z]: rose [ɹoʊz]; "si" in "measure" is [ʒ].
<br>• "y" at the start of a word is the consonant [j]: yes = [jɛs]. (IPA [j] is never the "j" of jam, which is [dʒ].)`,
      example: { q: "Transcribe “thing”.", steps: ["th here is voiceless: [θ].", "i in thing: [ɪ].", "ng is one velar nasal: [ŋ]. So [θɪŋ]."] },
      problems: [
        mcq("First sound of “think”?", ["[t]", "[θ]", "[ð]", "[ʃ]"], 1, "Voiceless dental fricative [θ]."),
        mcq("First sound of “this”?", ["[θ]", "[d]", "[ð]", "[z]"], 2, "Voiced dental fricative [ð]."),
        mcq("Last sound of “sing”?", ["[g]", "[n]", "[ŋ]", "[ng]"], 2, "One sound, the velar nasal [ŋ]."),
        mcq("First sound of “yes” in IPA?", ["[y]", "[j]", "[dʒ]", "[i]"], 1, "IPA [j] is the 'y' sound. [dʒ] is the 'j' in jam."),
        mcq("Middle consonant of “measure”?", ["[s]", "[z]", "[ʃ]", "[ʒ]"], 3, "Voiced postalveolar fricative [ʒ]."),
        mcq("First sound of “knight”?", ["[k]", "[n]", "[kn]", "[ŋ]"], 1, "The k is silent: [naɪt]."),
        mcq("First sound of “church”?", ["[k]", "[ʃ]", "[tʃ]", "[c]"], 2, "Voiceless postalveolar affricate [tʃ]."),
        mcq("First sound of “phone”?", ["[p]", "[f]", "[v]", "[ph]"], 1, "'ph' spells [f]."),
        mcq("Which word starts with [dʒ]?", ["yellow", "gem", "get", "zoo"], 1, "'gem' = [dʒɛm]; 'get' starts with [g]."),
        mcq("Last sound of “rose”?", ["[s]", "[z]", "[ʃ]", "[ə]"], 1, "The final 'se' is voiced [z]: [ɹoʊz]."),
      ],
    },
  ],
};

// Prompt for getting lessons for any other unit written by an AI (paste the result into the app).
export const LESSON_PROMPT = `Write lessons for one unit of my self-study app, as JSON only (no other text).

Unit: <COURSE NAME> — <UNIT TITLE>
Key concepts: <CONCEPTS>
(Optional) Source notes: <PASTE TEXT OR SAY "use the standard curriculum">

Output a JSON array of 4–8 knowledge points, in teaching order. Each:
{
  "id": "short-unique-id",
  "title": "Concept name",
  "teach": "A self-contained explanation of 120–300 words that teaches the idea from scratch to a strong university student. Define terms, give the key formula or rule, and point out the most common mistake. May use <b>, <i>, <sup>, <sub>, <br>.",
  "example": { "q": "A worked example question", "steps": ["step 1", "step 2", "final answer"] },
  "problems": [ 5–8 practice problems, each one of:
    { "q": "...", "type": "num", "a": 0.375, "sol": "full worked solution", "hint": "nudge" }
    { "q": "...", "type": "mc", "choices": ["...","...","...","..."], "a": 2, "sol": "...", "hint": "..." }
    { "q": "...", "type": "text", "a": ["accepted answer", "variant"], "sol": "...", "hint": "..." }
  ]
}
Rules: every answer must be correct and checkable (numbers for numeric answers, the index of the right choice for "mc"). Problems should range from direct application to one step of transfer. Do not invent facts.`;
