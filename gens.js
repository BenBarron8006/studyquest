// Problem generators: each call returns a fresh problem with random numbers, so practice never runs out
// and can target exactly the ideas you get wrong.
// Problem shape: { q, type: "num" | "mc" | "text", a, choices?, sol, hint }
//  num: a is a number; you may type an expression like 3/8, C(10,3)/2^10, 1-(5/6)^4
//  mc:  a is the index of the correct choice
//  text: a is a list of accepted answers (case-insensitive)

const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
export const C = (n, k) => { if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (p, q) => { const g = gcd(p, q); return q / g === 1 ? `${p / g}` : `${p / g}/${q / g}`; };
const r4 = (x) => (Math.round(x * 10000) / 10000).toString();
const pct = (x) => Math.round(x * 1000) / 10 + "%";
// Multiple choice with the right answer shuffled in.
function mc(q, right, wrongs, sol, hint) { const choices = shuffle([right, ...wrongs]); return { q, type: "mc", choices, a: choices.indexOf(right), sol, hint }; }

export const GEN = {
  /* ---------------- Probability, Ch. 1 ---------------- */
  diceSum() {
    const s = ri(2, 12), pairs = [];
    for (let a = 1; a <= 6; a++) { const b = s - a; if (b >= 1 && b <= 6) pairs.push(`(${a},${b})`); }
    return { q: `Roll two fair dice. What is the probability that the sum is ${s}?`, type: "num", a: pairs.length / 36,
      sol: `There are 6 × 6 = 36 equally likely ordered outcomes. The ones with sum ${s}: ${pairs.join(", ")}. That's ${pairs.length}, so P = ${pairs.length}/36${frac(pairs.length, 36) !== pairs.length + "/36" ? " = " + frac(pairs.length, 36) : ""}.`,
      hint: "Count ordered pairs (first die, second die): (2,5) and (5,2) are different outcomes." };
  },
  multRule() {
    if (Math.random() < 0.5) { const a = ri(3, 8), b = ri(4, 12), c = ri(2, 6); return { q: `A restaurant offers ${a} starters, ${b} mains and ${c} desserts. How many different three-course meals (one of each) are possible?`, type: "num", a: a * b * c, sol: `Each choice can be combined with every other: ${a} × ${b} × ${c} = ${a * b * c}.`, hint: "Choose the starter, then the main, then the dessert. Multiply." }; }
    const L = ri(2, 3), D = ri(2, 4);
    return { q: `A licence plate is ${L} letters (A–Z) followed by ${D} digits (0–9), repeats allowed. How many plates are possible?`, type: "num", a: 26 ** L * 10 ** D, sol: `${L} letter slots with 26 options each and ${D} digit slots with 10 each: 26^${L} × 10^${D} = ${(26 ** L * 10 ** D).toLocaleString()}.`, hint: "Each slot is a separate choice; repeats allowed means every slot has all options." };
  },
  orderedSampling() {
    const t = ri(0, 2);
    if (t === 0) { const n = ri(4, 10), k = ri(3, 5); return { q: `A lock code is ${k} symbols, each one of ${n} possible symbols, repeats allowed. How many codes?`, type: "num", a: n ** k, sol: `Ordered, with replacement: ${n}^${k} = ${(n ** k).toLocaleString()}.`, hint: "Order matters and you can reuse symbols." }; }
    if (t === 1) { const n = ri(6, 15), k = 3; const v = fact(n) / fact(n - k); return { q: `A club of ${n} people elects a president, a vice-president and a treasurer (three different people). How many outcomes?`, type: "num", a: v, sol: `Ordered, without replacement: ${n} × ${n - 1} × ${n - 2} = ${v}. (Same as ${n}!/(${n}−3)!.)`, hint: "Order matters (the roles differ) and no one can hold two roles." }; }
    const n = ri(4, 8); return { q: `In how many orders can ${n} different books be arranged on a shelf?`, type: "num", a: fact(n), sol: `${n} choices for the first spot, ${n - 1} for the next, and so on: ${n}! = ${fact(n)}.`, hint: "Fill the shelf left to right." };
  },
  comb() {
    const n = ri(6, 16), k = ri(2, Math.min(5, n - 2));
    return { q: `How many ways are there to choose a committee of ${k} people from ${n}? (Order doesn't matter.)`, type: "num", a: C(n, k), sol: `C(${n},${k}) = ${n}!/(${k}!·${n - k}!) = ${C(n, k)}. Ordered picks give ${n}!/(${n - k}!) and each committee is counted ${k}! times, so divide by ${k}!.`, hint: "Count ordered picks, then divide by the number of orderings of the same group." };
  },
  hyperCommittee() {
    const w = ri(4, 9), m = ri(4, 9), k = ri(3, 5), j = ri(1, Math.min(k, w) - (k > w ? 0 : 0));
    const p = (C(w, j) * C(m, k - j)) / C(w + m, k);
    return { q: `A committee of ${k} is chosen at random from ${w} women and ${m} men. What is the probability it has exactly ${j} women?`, type: "num", a: p,
      sol: `All C(${w + m},${k}) = ${C(w + m, k)} committees are equally likely. Favourable: choose ${j} of the ${w} women and ${k - j} of the ${m} men: C(${w},${j})·C(${m},${k - j}) = ${C(w, j) * C(m, k - j)}. P = ${C(w, j) * C(m, k - j)}/${C(w + m, k)} ≈ ${r4(p)}.`, hint: "Denominator: all committees. Numerator: pick the women and the men separately, then multiply." };
  },
  boseEinstein() {
    const n = ri(3, 6), k = ri(4, 10);
    if (Math.random() < 0.5) return { q: `How many ways can ${k} identical cookies be given to ${n} children (some may get none)?`, type: "num", a: C(n + k - 1, k), sol: `Stars and bars: ${k} stars and ${n - 1} bars in a row; choose where the bars go. C(${n + k - 1},${n - 1}) = ${C(n + k - 1, k)}.`, hint: "Write the cookies as stars and use bars to split them into children's piles." };
    const kk = Math.max(k, n);
    return { q: `How many ways can ${kk} identical cookies be given to ${n} children if every child gets at least one?`, type: "num", a: C(kk - 1, n - 1), sol: `Give each child one first, leaving ${kk - n} to distribute freely: C(${kk - n + n - 1},${n - 1}) = ${C(kk - 1, n - 1)}. (Equivalently, choose ${n - 1} of the ${kk - 1} gaps between stars.)`, hint: "Hand out the guaranteed cookies first, then use stars and bars on the rest." };
  },
  complement() {
    if (Math.random() < 0.5) { const k = ri(2, 8); const p = 1 - (5 / 6) ** k; return { q: `Roll a fair die ${k} times. What is the probability of at least one 6?`, type: "num", a: p, sol: `Complement: P(no 6 at all) = (5/6)^${k}. So P(at least one 6) = 1 − (5/6)^${k} ≈ ${r4(p)}.`, hint: "“At least one” is easier through its opposite: “none”." }; }
    const k = ri(10, 40); let none = 1; for (let i = 0; i < k; i++) none *= (365 - i) / 365;
    return { q: `${k} people are in a room (365 equally likely birthdays, no leap years). Probability that at least two share a birthday? (A decimal is fine.)`, type: "num", a: 1 - none, sol: `P(all different) = (365·364·…·${365 - k + 1})/365^${k} ≈ ${r4(none)}. So P(some match) = 1 − that ≈ ${r4(1 - none)}. With 23 people it already passes 50%.`, hint: "Compute P(all birthdays different) by choosing birthdays one person at a time." };
  },
  inclExcl() {
    const pairs = [[2, 3], [2, 5], [3, 5], [2, 7], [3, 7], [4, 5], [3, 4], [5, 7]], [a, b] = pick(pairs), N = pick([60, 100, 120, 200, 210, 300, 420]);
    const na = Math.floor(N / a), nb = Math.floor(N / b), nab = Math.floor(N / (a * b)), u = na + nb - nab;
    return { q: `Pick an integer uniformly at random from 1 to ${N}. What is the probability it is divisible by ${a} or by ${b}?`, type: "num", a: u / N, sol: `|A| = ⌊${N}/${a}⌋ = ${na}, |B| = ⌊${N}/${b}⌋ = ${nb}, both (divisible by ${a * b}) = ${nab}. |A∪B| = ${na} + ${nb} − ${nab} = ${u}. P = ${u}/${N} = ${frac(u, N)}.`, hint: "Add the two counts, then subtract what you counted twice." };
  },
  /* ---------------- Probability, Ch. 2 ---------------- */
  condDice() {
    if (Math.random() < 0.5) {
      const s = ri(7, 11); let tot = 0, six = 0, list = [];
      for (let a = 1; a <= 6; a++) { const b = s - a; if (b >= 1 && b <= 6) { tot++; list.push(`(${a},${b})`); if (a === 6 || b === 6) six++; } }
      return { q: `Two fair dice are rolled. Given that the sum is ${s}, what is the probability that at least one die shows a 6?`, type: "num", a: six / tot, sol: `Conditioning on sum = ${s} shrinks the sample space to ${list.join(", ")} (${tot} outcomes, still equally likely). ${six} of them contain a 6. P = ${frac(six, tot)}.`, hint: "Condition = new, smaller sample space. List it." };
    }
    const t = ri(8, 11); let tot = 11, good = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if ((a === 6 || b === 6) && a + b >= t) good++;
    return { q: `Two fair dice are rolled. Given that at least one die shows a 6, what is the probability the sum is at least ${t}?`, type: "num", a: good / tot, sol: `“At least one 6” has 11 outcomes (6 with the first die = 6, 6 with the second, minus (6,6) counted twice). Of these, ${good} have sum ≥ ${t}. P = ${frac(good, tot)}.`, hint: "How many of the 36 outcomes have at least one 6? Careful not to count (6,6) twice." };
  },
  urnTwo() {
    const r = ri(3, 8), b = ri(2, 8), n = r + b, t = ri(0, 2);
    if (t === 0) return { q: `An urn has ${r} red and ${b} blue balls. You draw 2 without replacement. Probability both are red?`, type: "num", a: (r / n) * ((r - 1) / (n - 1)), sol: `P(1st red) = ${r}/${n}; given that, P(2nd red) = ${r - 1}/${n - 1}. Multiply: ${r * (r - 1)}/${n * (n - 1)} = ${frac(r * (r - 1), n * (n - 1))}.`, hint: "P(A and B) = P(A) · P(B | A)." };
    if (t === 1) return { q: `An urn has ${r} red and ${b} blue balls. Draw 2 without replacement. Probability of one of each colour?`, type: "num", a: (2 * r * b) / (n * (n - 1)), sol: `Red then blue: ${r}/${n} · ${b}/${n - 1}. Blue then red: ${b}/${n} · ${r}/${n - 1}. Add: ${2 * r * b}/${n * (n - 1)} = ${frac(2 * r * b, n * (n - 1))}.`, hint: "Two orders can give one of each. Add them." };
    return { q: `An urn has ${r} red and ${b} blue balls. Draw 2 without replacement. Probability the SECOND ball is red? (No information about the first.)`, type: "num", a: r / n, sol: `Total probability: ${r}/${n}·${r - 1}/${n - 1} + ${b}/${n}·${r}/${n - 1} = ${r}/${n}. By symmetry every position is equally likely to hold any given ball, so it's just ${frac(r, n)}.`, hint: "Split on what the first ball was, or think about symmetry." };
  },
  totalProb() {
    const pA = pick([0.3, 0.4, 0.5, 0.6, 0.7]), dA = pick([0.01, 0.02, 0.03, 0.05]), dB = pick([0.02, 0.04, 0.06, 0.08]);
    const v = pA * dA + (1 - pA) * dB;
    return { q: `Factory A makes ${pct(pA)} of a company's phones and factory B the rest. ${pct(dA)} of A's phones are defective, and ${pct(dB)} of B's. What fraction of all phones are defective?`, type: "num", a: v, sol: `Law of total probability: P(D) = P(D|A)P(A) + P(D|B)P(B) = ${dA}·${pA} + ${dB}·${r4(1 - pA)} = ${r4(v)}.`, hint: "Split by which factory made the phone, then weight each defect rate by that factory's share." };
  },
  bayesTest() {
    const p = pick([0.001, 0.005, 0.01, 0.02, 0.05]), se = pick([0.9, 0.95, 0.98, 0.99]), sp = pick([0.9, 0.95, 0.98, 0.99]);
    const num = p * se, den = num + (1 - p) * (1 - sp), v = num / den;
    return { q: `A disease affects ${pct(p)} of people. A test catches it ${pct(se)} of the time when it's present (sensitivity) and correctly says “negative” ${pct(sp)} of the time when it's absent (specificity). You test positive. Probability you have the disease?`, type: "num", a: v,
      sol: `Bayes: P(D|+) = P(+|D)P(D) / P(+). Numerator ${se}·${p} = ${r4(num)}. P(+) = ${r4(num)} + ${r4(1 - sp)}·${r4(1 - p)} = ${r4(den)}. So P(D|+) ≈ ${r4(v)}. Rare diseases make most positives false positives.`, hint: "Imagine 100,000 people. How many are sick and test positive? How many are healthy and test positive anyway?" };
  },
  bayesFactory() {
    const pA = pick([0.3, 0.4, 0.6, 0.7]), dA = pick([0.01, 0.02, 0.05]), dB = pick([0.03, 0.04, 0.08]);
    const v = (pA * dA) / (pA * dA + (1 - pA) * dB);
    return { q: `Factory A makes ${pct(pA)} of phones (defect rate ${pct(dA)}); factory B makes the rest (defect rate ${pct(dB)}). A random phone is defective. Probability it came from A?`, type: "num", a: v, sol: `P(A|D) = P(D|A)P(A)/P(D) = (${dA}·${pA}) / (${dA}·${pA} + ${dB}·${r4(1 - pA)}) ≈ ${r4(v)}.`, hint: "Bayes' rule: flip P(D|A) into P(A|D). The denominator is the total defect rate." };
  },
  indep() {
    const a = pick([0.2, 0.3, 0.4, 0.5, 0.6]), b = pick([0.1, 0.25, 0.5, 0.7, 0.8]), t = ri(0, 2);
    if (t === 0) return { q: `A and B are independent with P(A) = ${a} and P(B) = ${b}. Find P(A or B).`, type: "num", a: a + b - a * b, sol: `P(A∪B) = P(A) + P(B) − P(A∩B), and independence gives P(A∩B) = ${a}·${b} = ${r4(a * b)}. So ${r4(a + b - a * b)}.`, hint: "Inclusion–exclusion, with P(A∩B) = P(A)P(B)." };
    if (t === 1) return { q: `A and B are independent with P(A) = ${a} and P(B) = ${b}. Probability that neither happens?`, type: "num", a: (1 - a) * (1 - b), sol: `If A and B are independent so are their complements: (1 − ${a})(1 − ${b}) = ${r4((1 - a) * (1 - b))}.`, hint: "Neither = (not A) and (not B)." };
    return { q: `A and B are independent with P(A) = ${a} and P(B) = ${b}. Probability that exactly one of them happens?`, type: "num", a: a * (1 - b) + (1 - a) * b, sol: `A only: ${a}·${r4(1 - b)}; B only: ${r4(1 - a)}·${b}. Sum: ${r4(a * (1 - b) + (1 - a) * b)}.`, hint: "Exactly one = (A and not B) or (B and not A); these don't overlap." };
  },
  /* ---------------- Probability, Ch. 3 ---------------- */
  pmfMissing() {
    const base = shuffle([0.1, 0.15, 0.2, 0.25, 0.3, 0.05]).slice(0, 3), s = base.reduce((x, y) => x + y, 0);
    if (s >= 1) return GEN.pmfMissing();
    const miss = Math.round((1 - s) * 100) / 100, probs = [...base, miss], k = ri(0, 3), t = ri(0, 1);
    if (t === 0) return { q: `X takes the values 0, 1, 2, 3 with P(X=0) = ${probs[0]}, P(X=1) = ${probs[1]}, P(X=2) = ${probs[2]}, and P(X=3) unknown. Find P(X=3).`, type: "num", a: miss, sol: `A PMF must sum to 1: ${probs[0]} + ${probs[1]} + ${probs[2]} + P(X=3) = 1, so P(X=3) = ${miss}.`, hint: "All the probabilities of a PMF add up to 1." };
    const v = probs.slice(k).reduce((x, y) => x + y, 0);
    return { q: `X has PMF P(X=0) = ${probs[0]}, P(X=1) = ${probs[1]}, P(X=2) = ${probs[2]}, P(X=3) = ${miss}. Find P(X ≥ ${k}).`, type: "num", a: v, sol: `Add P(X=j) for j ≥ ${k}: ${probs.slice(k).join(" + ")} = ${r4(v)}.`, hint: "An event about X is a set of values; add their probabilities." };
  },
  cdf() {
    const probs = [0.1, 0.2, 0.3, 0.4].sort(() => Math.random() - 0.5), k = ri(0, 2), x = k + pick([0, 0.5]);
    const v = probs.slice(0, k + 1).reduce((a, b) => a + b, 0);
    return { q: `X has PMF P(X=0) = ${probs[0]}, P(X=1) = ${probs[1]}, P(X=2) = ${probs[2]}, P(X=3) = ${probs[3]}. What is the CDF F(${x}) = P(X ≤ ${x})?`, type: "num", a: v, sol: `F(${x}) adds P(X = j) for every j ≤ ${x}: ${probs.slice(0, k + 1).join(" + ")} = ${r4(v)}.${x !== k ? " The CDF is flat between integers, so F(" + x + ") = F(" + k + ")." : ""}`, hint: "F(x) = P(X ≤ x): add up the PMF up to x." };
  },
  binom() {
    const n = ri(4, 12), p = pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6]), q = Math.round((1 - p) * 100) / 100;
    if (Math.random() < 0.65) { const k = ri(1, Math.min(n - 1, 5)), v = C(n, k) * p ** k * q ** (n - k); return { q: `X ~ Bin(${n}, ${p}). Find P(X = ${k}).`, type: "num", a: v, sol: `P(X=k) = C(n,k) p^k (1−p)^(n−k) = C(${n},${k}) · ${p}^${k} · ${q}^${n - k} = ${C(n, k)} · ${r4(p ** k)} · ${r4(q ** (n - k))} ≈ ${r4(v)}.`, hint: "C(n,k) counts which trials succeed; p^k(1−p)^(n−k) is the chance of any one such pattern." }; }
    const v = 1 - q ** n; return { q: `A free-throw shooter makes each shot independently with probability ${p}. In ${n} shots, what is the probability she makes at least one?`, type: "num", a: v, sol: `X ~ Bin(${n}, ${p}). P(X ≥ 1) = 1 − P(X = 0) = 1 − ${q}^${n} ≈ ${r4(v)}.`, hint: "Use the complement: zero successes." };
  },
  hyper() {
    if (Math.random() < 0.5) { const k = ri(0, 3), v = (C(13, k) * C(39, 5 - k)) / C(52, 5); return { q: `A 5-card hand is dealt from a standard 52-card deck. Probability it contains exactly ${k} hearts?`, type: "num", a: v, sol: `Hypergeometric: C(13,${k})·C(39,${5 - k}) / C(52,5) = ${C(13, k)}·${C(39, 5 - k)} / ${C(52, 5)} ≈ ${r4(v)}.`, hint: "Choose the hearts from the 13 hearts and the rest from the 39 non-hearts." }; }
    const w = ri(4, 10), b = ri(4, 10), n = ri(3, 5), k = ri(1, Math.min(n, w)), v = (C(w, k) * C(b, n - k)) / C(w + b, n);
    return { q: `An urn has ${w} white and ${b} black balls. Draw ${n} without replacement. Probability exactly ${k} are white?`, type: "num", a: v, sol: `X ~ HGeom(${w}, ${b}, ${n}): C(${w},${k})·C(${b},${n - k}) / C(${w + b},${n}) = ${C(w, k) * C(b, n - k)}/${C(w + b, n)} ≈ ${r4(v)}.`, hint: "Same structure as a committee problem." };
  },
  /* ---------------- Linguistics ---------------- */
  plural() {
    const W = [["cat", "s", "t"], ["dog", "z", "g"], ["bus", "ɪz", "s"], ["book", "s", "k"], ["bee", "z", "i"], ["judge", "ɪz", "dʒ"], ["cup", "s", "p"], ["bag", "z", "g"], ["wish", "ɪz", "ʃ"], ["myth", "s", "θ"], ["car", "z", "ɹ"], ["rose", "ɪz", "z"], ["laugh", "s", "f"], ["pen", "z", "n"], ["church", "ɪz", "tʃ"], ["lake", "s", "k"], ["day", "z", "eɪ"], ["garage", "ɪz", "ʒ"], ["hat", "s", "t"], ["bed", "z", "d"], ["box", "ɪz", "s"], ["sofa", "z", "ə"]];
    const [w, a, f] = pick(W), why = a === "ɪz" ? `it ends in a sibilant /${f}/` : a === "s" ? `it ends in a voiceless non-sibilant /${f}/` : `it ends in a voiced non-sibilant sound /${f}/`;
    const choices = ["[s]", "[z]", "[ɪz]"];
    return { q: `How is the plural ending pronounced in “${w}s/${w}es”?`, type: "mc", choices, a: choices.indexOf(`[${a}]`), sol: `[${a}], because ${why}. Rule: [ɪz] after sibilants (s z ʃ ʒ tʃ dʒ), [s] after other voiceless sounds, [z] after other voiced sounds (including vowels).`, hint: "Look at the last sound (not letter). Is it a hissing/hushing sound? If not, is it voiced?" };
  },
  past() {
    const W = [["walk", "t", "k"], ["play", "d", "eɪ"], ["want", "ɪd", "t"], ["kiss", "t", "s"], ["hug", "d", "g"], ["need", "ɪd", "d"], ["laugh", "t", "f"], ["climb", "d", "m"], ["start", "ɪd", "t"], ["wish", "t", "ʃ"], ["rob", "d", "b"], ["fade", "ɪd", "d"], ["stop", "t", "p"], ["call", "d", "l"], ["wait", "ɪd", "t"], ["fix", "t", "s"], ["love", "d", "v"], ["land", "ɪd", "d"]];
    const [w, a, f] = pick(W), choices = ["[t]", "[d]", "[ɪd]"];
    const why = a === "ɪd" ? `the stem ends in /${f}/, an alveolar stop like the suffix itself` : a === "t" ? `the stem ends in voiceless /${f}/` : `the stem ends in voiced /${f}/`;
    return { q: `How is the past-tense ending pronounced in “${w}ed”?`, type: "mc", choices, a: choices.indexOf(`[${a}]`), sol: `[${a}]: ${why}. Rule: [ɪd] after /t/ and /d/, [t] after other voiceless sounds, [d] after other voiced sounds.`, hint: "Same logic as the plural: last sound, then voicing." };
  },
  turkish() {
    const W = [["ev", "evler", "house"], ["kitap", "kitaplar", "book"], ["göz", "gözler", "eye"], ["okul", "okullar", "school"], ["kız", "kızlar", "girl"], ["gün", "günler", "day"], ["el", "eller", "hand"], ["at", "atlar", "horse"], ["köy", "köyler", "village"], ["dil", "diller", "language"], ["yol", "yollar", "road"], ["baş", "başlar", "head"]];
    const [w, pl, gl] = pick(W), choices = [w + "ler", w + "lar"];
    const lastV = [...w].reverse().find((c) => "aeıioöuü".includes(c)), front = "eiöü".includes(lastV);
    return { q: `Turkish plural is -ler or -lar. Which is the plural of “${w}” ('${gl}')?`, type: "mc", choices, a: choices.indexOf(pl), sol: `${pl}. The last vowel of “${w}” is “${lastV}”, a ${front ? "front" : "back"} vowel, so the suffix takes ${front ? "front e (-ler)" : "back a (-lar)"}. That's vowel harmony: the suffix copies frontness from the stem.`, hint: "Front vowels: e i ö ü. Back vowels: a ı o u. Find the stem's last vowel." };
  },
  consonant(mode) {
    const T = [["p", "voiceless", "bilabial", "stop"], ["b", "voiced", "bilabial", "stop"], ["t", "voiceless", "alveolar", "stop"], ["d", "voiced", "alveolar", "stop"], ["k", "voiceless", "velar", "stop"], ["g", "voiced", "velar", "stop"], ["f", "voiceless", "labiodental", "fricative"], ["v", "voiced", "labiodental", "fricative"], ["θ", "voiceless", "dental", "fricative"], ["ð", "voiced", "dental", "fricative"], ["s", "voiceless", "alveolar", "fricative"], ["z", "voiced", "alveolar", "fricative"], ["ʃ", "voiceless", "postalveolar", "fricative"], ["ʒ", "voiced", "postalveolar", "fricative"], ["h", "voiceless", "glottal", "fricative"], ["tʃ", "voiceless", "postalveolar", "affricate"], ["dʒ", "voiced", "postalveolar", "affricate"], ["m", "voiced", "bilabial", "nasal"], ["n", "voiced", "alveolar", "nasal"], ["ŋ", "voiced", "velar", "nasal"], ["l", "voiced", "alveolar", "lateral approximant"], ["ɹ", "voiced", "alveolar", "approximant"], ["j", "voiced", "palatal", "approximant"]];
    const EX = { p: "pat", b: "bat", t: "tip", d: "dip", k: "cat", g: "go", f: "fan", v: "van", θ: "think", ð: "this", s: "sip", z: "zip", ʃ: "ship", ʒ: "measure (middle)", h: "hat", tʃ: "church", dʒ: "judge", m: "man", n: "net", ŋ: "sing (end)", l: "lip", ɹ: "red", j: "yes" };
    const [sym, voi, place, manner] = pick(T), m = mode || pick(["voicing", "place", "manner", "symbol"]);
    const desc = `voiceless/voiced = ${voi}, place = ${place}, manner = ${manner}`;
    if (m === "voicing") return { q: `Is [${sym}] (as in “${EX[sym]}”) voiced or voiceless?`, type: "mc", choices: ["voiced", "voiceless"], a: voi === "voiced" ? 0 : 1, sol: `[${sym}] is ${voi}: ${desc}. Test: hand on your throat; voiced sounds buzz.`, hint: "Say it on its own, hand on your throat. Buzz = voiced." };
    if (m === "place") return mc(`Where is [${sym}] (as in “${EX[sym]}”) articulated?`, place, shuffle(["bilabial", "labiodental", "dental", "alveolar", "postalveolar", "palatal", "velar", "glottal"].filter((x) => x !== place)).slice(0, 3), `[${sym}]: ${desc}.`, "Feel where your tongue or lips make the narrowest point.");
    if (m === "manner") return mc(`What is the manner of articulation of [${sym}] (as in “${EX[sym]}”)?`, manner, shuffle(["stop", "fricative", "affricate", "nasal", "approximant", "lateral approximant"].filter((x) => x !== manner)).slice(0, 3), `[${sym}]: ${desc}.`, "Full closure? Hissing friction? Air through the nose? Barely any obstruction?");
    const others = shuffle(T.filter((x) => x[0] !== sym)).slice(0, 3).map((x) => x[0]);
    return mc(`Which IPA symbol is the ${voi} ${place} ${manner}?`, sym, others, `[${sym}], as in “${EX[sym]}”.`, "Build it up: place first, then manner, then voicing.");
  },
  vowel() {
    const V = [["i", "high", "front", "unrounded", "beat"], ["ɪ", "high (lax)", "front", "unrounded", "bit"], ["u", "high", "back", "rounded", "boot"], ["ʊ", "high (lax)", "back", "rounded", "book"], ["ɛ", "mid", "front", "unrounded", "bet"], ["æ", "low", "front", "unrounded", "bat"], ["ɑ", "low", "back", "unrounded", "father"], ["ə", "mid", "central", "unrounded", "sofa (2nd vowel)"], ["ʌ", "mid (low-mid)", "back/central", "unrounded", "but"]];
    const [sym, h, b, r, ex] = pick(V);
    const others = shuffle(V.filter((x) => x[0] !== sym)).slice(0, 3);
    return mc(`Which vowel is ${h}, ${b}, ${r}? (Hint word hidden.)`, `[${sym}]`, others.map((x) => `[${x[0]}]`), `[${sym}] as in “${ex}”: ${h}, ${b}, ${r}.`, "Height = how high the tongue is; front/back = where the tongue bunches; rounded = lips.");
  },
};
GEN.consonantVoicing = () => GEN.consonant("voicing");
GEN.consonantPlace = () => GEN.consonant("place");
GEN.consonantManner = () => GEN.consonant("manner");
GEN.consonantSymbol = () => GEN.consonant("symbol");

// Safe evaluation of what the learner types: numbers, + − × ÷ ^ ( ), n!, C(n,k), %.
export function evalAnswer(s) {
  let t = String(s).trim().replace(/[×x]/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,(?=\d{3}\b)/g, "").replace(/\s+/g, "");
  if (!t) return NaN;
  let isPct = false;
  if (/%$/.test(t)) { isPct = true; t = t.slice(0, -1); }
  if (!/^[0-9+\-*/().^!,C]+$/.test(t)) return NaN;
  t = t.replace(/\^/g, "**").replace(/(\d+)!/g, "F($1)");
  try { const v = Function("F", "C", `"use strict";return (${t});`)(fact, C); return isPct ? v / 100 : v; } catch { return NaN; }
}
export function checkAnswer(p, given) {
  if (p.type === "mc") return Number(given) === p.a;
  if (p.type === "text") { const g = String(given).trim().toLowerCase().replace(/\s+/g, " "); return p.a.some((x) => String(x).toLowerCase() === g); }
  const v = evalAnswer(given);
  return Number.isFinite(v) && Math.abs(v - p.a) <= Math.max(5e-4, Math.abs(p.a) * 1e-3);
}
