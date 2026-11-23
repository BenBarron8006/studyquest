// Arena content: brainteasers (a fixed bank plus generators, so there's always a fresh set),
// number sequences, expected-value bets, and a probability blitz. All answers are checked automatically.
import { GEN, C } from "./gens.js";

const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const r4 = (x) => String(Math.round(x * 10000) / 10000);
const num = (id, q, a, sol, hint = "") => ({ id, q, type: "num", a, sol, hint });
const mc = (id, q, choices, a, sol, hint = "") => ({ id, q, type: "mc", choices, a, sol, hint });

export const PUZZLE_BANK = [
  num("b1", "On average, how many rolls of a fair die does it take to get a 6?", 6, "The number of rolls is Geometric with success probability p = 1/6, and a Geometric's mean is 1/p = 6. Why 1/p: let E be the expected number. Roll once; with probability 1/6 you're done, otherwise you're back where you started having used one roll: E = 1 + (5/6)E, so E = 6.", "Write an equation for E by conditioning on the first roll."),
  num("b2", "Roll a die. You may keep the value, or reroll once and must keep the second roll. What is the game worth with optimal play?", 4.25, "If you reroll you expect 3.5, so keep anything above 3.5 (4, 5, 6) and reroll 1–3. Value = (1/2)·(average of 4, 5, 6 = 5) + (1/2)·3.5 = 4.25.", "Work backwards: what is a reroll worth?"),
  num("b3", "Expected number of fair-coin flips until you first see two heads in a row (HH)?", 6, "Let a = expected flips from scratch, b = expected flips when the last flip was H. a = 1 + ½b + ½a, b = 1 + ½·0 + ½a. Solving: a = 6. HH is slower than HT because a failed HH attempt (HT) throws away your progress.", "Use states: 'nothing yet' and 'just saw H'."),
  num("b4", "Expected number of fair-coin flips until you first see heads followed by tails (HT)?", 4, "Wait for the first H (expected 2 flips), then wait for the first T after it (expected 2 more). Once you have an H, a further H doesn't hurt you. Total 4.", "Once you've seen H, what are you waiting for?"),
  num("b5", "A family has two children and at least one is a boy. Probability both are boys? (Boys and girls equally likely, independent.)", 1 / 3, "Equally likely families: BB, BG, GB, GG. 'At least one boy' removes GG, leaving 3 equally likely cases, one of which is BB: 1/3.", "List the sample space, then condition."),
  num("b6", "Shuffle n cards labeled 1..n. What is the expected number of cards that end up in their original position?", 1, "Linearity of expectation with indicators: let Iⱼ = 1 if card j is in position j. P(Iⱼ = 1) = 1/n, so E[ΣIⱼ] = n·(1/n) = 1, for every n. Linearity works even though the Iⱼ are dependent.", "Write the count as a sum of 0/1 indicators."),
  num("b7", "Expected value of the maximum of two fair dice?", 161 / 36, "P(max ≤ k) = (k/6)², so P(max = k) = (k² − (k−1)²)/36 = (2k−1)/36. E = Σ k(2k−1)/36 = (1 + 6 + 15 + 28 + 45 + 66)/36 = 161/36 ≈ 4.47.", "Find P(max ≤ k) first; it's easier than P(max = k)."),
  num("b8", "Break a stick at two uniformly random points. Probability the three pieces can form a triangle?", 1 / 4, "Three lengths form a triangle exactly when every piece is shorter than half the stick. In the unit square of the two break points, the region where all pieces are < 1/2 has area 1/4.", "Triangle inequality: no piece can be ≥ half the total."),
  num("b9", "Expected number of die rolls until you've seen all six faces?", 14.7, "Coupon collector: after seeing k faces, a new face appears with probability (6−k)/6, so you wait 6/(6−k) rolls on average. Sum: 6(1/6 + 1/5 + 1/4 + 1/3 + 1/2 + 1) = 6 · 2.45 = 14.7.", "Split the wait into stages: waiting for the 2nd new face, the 3rd, ..."),
  mc("b10", "Monty Hall: you pick door 1; the host, who knows where the car is, opens a goat door and offers a switch. Probability of winning if you switch?", ["1/3", "1/2", "2/3"], 2, "Your first pick is right 1/3 of the time and the host's action can't change that. In the other 2/3 of cases the car is behind the one door he left closed, so switching wins 2/3.", "Would switching win if your first pick was wrong?"),
  num("b11", "Fair coin. You start with $3 and bet $1 per flip until you reach $10 or go broke. Probability you reach $10?", 0.3, "A fair game keeps your expected wealth constant (a martingale). Ending wealth is 10 with probability p and 0 otherwise: 10p = 3, so p = 3/10.", "Your expected fortune never changes in a fair game."),
  num("b12", "Expected product of two independent fair dice?", 12.25, "For independent X and Y, E[XY] = E[X]E[Y] = 3.5 · 3.5 = 12.25.", "Independence lets expectations multiply."),
  num("b13", "30 people. Expected number of pairs who share a birthday (365 days, ignore leap years)?", 435 / 365, "There are C(30,2) = 435 pairs, and each pair matches with probability 1/365. By linearity, expected matching pairs = 435/365 ≈ 1.19.", "Indicator for each pair, then linearity."),
  num("b14", "Roll a die and get paid the square of the face (in dollars). Fair price to play?", 91 / 6, "E[X²] = (1 + 4 + 9 + 16 + 25 + 36)/6 = 91/6 ≈ 15.17. Note E[X²] ≠ (E[X])² = 12.25; the difference is the variance, 35/12.", "Average the six squares."),
  num("b15", "Roll two dice repeatedly. Expected number of rolls until the sum is 7?", 6, "P(sum = 7) = 6/36 = 1/6 each roll, so the wait is Geometric with mean 1/(1/6) = 6.", "What's P(sum = 7) on one roll?"),
  num("b16", "Flip 3 fair coins. Probability of at least 2 heads?", 0.5, "Exactly 2 heads: C(3,2) = 3 outcomes; 3 heads: 1. That's 4 of 8 = 1/2 (or by symmetry: at least 2 heads ⇔ at most 1 tail, which mirrors at most 1 head).", "Count outcomes out of 8."),
  num("b17", "Fair coin. Expected number of heads before the first tail?", 1, "P(k heads then a tail) = (1/2)^(k+1). E = Σ k(1/2)^(k+1) = 1. Or: the total flips until the first tail has mean 2, and one of them is the tail.", "Relate it to the number of flips until the first tail."),
  num("b18", "Roll two dice. Probability the sum is prime?", 5 / 12, "Prime sums 2, 3, 5, 7, 11 occur 1 + 2 + 4 + 6 + 2 = 15 ways out of 36: 15/36 = 5/12.", "List the prime sums and count each."),
  num("b19", "An ant walks randomly along the edges of a cube, choosing each of the 3 edges equally at each vertex. Expected number of steps to reach the opposite corner?", 10, "Group vertices by distance from the target: 3, 2, 1, 0. Let Eₖ be the expected steps from distance k. E₃ = 1 + E₂; E₂ = 1 + (2/3)E₁ + (1/3)E₃; E₁ = 1 + (1/3)·0 + (2/3)E₂. Solving gives E₃ = 10.", "Use symmetry: only the distance to the target matters."),
  num("b20", "Flip a fair coin until you've seen 2 heads in total (not necessarily in a row). Expected number of flips?", 4, "Each head takes a Geometric(1/2) wait with mean 2, and the two waits add: 2 + 2 = 4.", "Split it into two waits."),
  num("b21", "A bag has 2 red and 2 blue balls. Draw without replacement until you get red. Expected number of draws?", 5 / 3, "First red at draw 1: 1/2. At draw 2: (1/2)(2/3) = 1/3. At draw 3: (1/2)(1/3) = 1/6. E = 1·(1/2) + 2·(1/3) + 3·(1/6) = 5/3.", "Find the probability the first red is at draw 1, 2, 3."),
  num("b22", "Draw 2 cards from a standard deck. Probability they're the same suit?", 4 / 17, "Whatever the first card is, 12 of the remaining 51 cards share its suit: 12/51 = 4/17.", "Fix the first card; only the second matters."),
  num("b23", "A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How much is the ball, in dollars?", 0.05, "Ball = x, bat = x + 1. Then 2x + 1 = 1.10, so x = 0.05. The intuitive answer 0.10 would make the total 1.20.", "Write it as an equation."),
  num("b24", "How many times do the hour and minute hands of a clock overlap in 12 hours?", 11, "The minute hand gains 360° − 30° = 330° per hour on the hour hand, so overlaps happen every 12/11 hours: 11 times in 12 hours (the 12:00 overlap counted once).", "How fast does the minute hand gain on the hour hand?"),
  mc("b25", "A revolver has 6 chambers with 2 bullets in adjacent chambers. The cylinder is spun and the first pull is a blank. For your pull, is it better to spin again or not?", ["Spin again", "Don't spin", "It doesn't matter"], 1, "Spinning: survive with probability 4/6 = 2/3. Not spinning: the blank was one of 4 empty chambers; the next chamber after 3 of those 4 is also empty (only the empty chamber right before the bullets leads into one), so you survive with probability 3/4 > 2/3.", "Given the blank, which chamber could you be on, and what comes next?"),
  num("b26", "X and Y are independent Uniform(0, 1). Expected value of min(X, Y)?", 1 / 3, "P(min > t) = (1 − t)², so E[min] = ∫₀¹ (1 − t)² dt = 1/3. Intuition: two random points split [0,1] into three pieces of equal expected length 1/3.", "Use E[Z] = ∫ P(Z > t) dt for Z ≥ 0."),
  num("b27", "Flip a fair coin until the first head. Probability the first head comes on an even-numbered flip?", 1 / 3, "Let p = P(even). The first flip is T with probability 1/2, after which the roles of odd and even swap: p = (1/2)(1 − p). So p = 1/3.", "Condition on the first flip."),
  num("b28", "Roll a die until you get a 6. Expected sum of all the rolls, including the 6?", 21, "You expect 6 rolls: 5 non-sixes and the 6. Each non-six is uniform on 1–5 (mean 3), so the expected sum is 5·3 + 6 = 21.", "How many rolls before the 6, and what's their average?"),
  num("b29", "Flip a fair coin 4 times. Probability of getting two heads in a row somewhere?", 0.5, "Count sequences with no HH: they follow the Fibonacci numbers, giving 8 of the 16 length-4 sequences. So P(some HH) = 1 − 8/16 = 1/2.", "Count the sequences that avoid HH, then take the complement."),
  num("b30", "Three points are chosen uniformly on a circle. Probability the triangle contains the circle's center?", 1 / 4, "The center is inside exactly when the points don't all lie in one semicircle. P(all in some semicircle) = 3/4 for 3 points, so the answer is 1/4.", "When is the center outside the triangle?"),
];

// Generated brainteasers: fresh numbers every time, so there's always a new set.
const PGEN = [
  () => { const k = pick([1, 2, 3, 5, 10]), c = ri(2, 4) * k; return num("g", `Pay $${c} to roll a die; you're paid $${k} × the face value. What is your expected profit per game?`, 3.5 * k - c, `Expected payout = ${k} × E[face] = ${k} × 3.5 = ${3.5 * k}. Profit = ${3.5 * k} − ${c} = ${3.5 * k - c}.`, "Expected payout minus the price."); },
  () => { const p = pick([0.1, 0.2, 0.25, 0.4]); return num("g", `A biased coin lands heads with probability ${p}. Expected number of flips until the first head?`, 1 / p, `Geometric wait with success probability ${p}: mean 1/${p} = ${r4(1 / p)}. (E = 1 + (1 − ${p})E gives the same.)`, "Mean of a Geometric is 1/p."); },
  () => { const n = ri(2, 8), v = 6 * (1 - (5 / 6) ** n); return num("g", `Roll a die ${n} times. Expected number of distinct faces you see?`, v, `Indicator for each face: P(face j appears at least once) = 1 − (5/6)^${n}. By linearity, E = 6(1 − (5/6)^${n}) ≈ ${r4(v)}.`, "Indicators for each of the six faces."); },
  () => { const N = ri(6, 20), a = ri(1, N - 1); return num("g", `Fair coin, $1 per flip. You start with $${a} and stop at $${N} or $0. Probability you reach $${N}?`, a / N, `Fair game ⇒ expected final wealth = starting wealth: ${N}p = ${a}, so p = ${a}/${N}.`, "Fair game: expected wealth is constant."); },
  () => { const t = ri(8, 11); let c = 0; for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (x + y >= t) c++; return num("g", `Roll two dice. Probability the sum is at least ${t}?`, c / 36, `Count ordered pairs with sum ≥ ${t}: ${c} of 36, so ${c}/36.`, "Count from the top: 12 one way, 11 two ways, ..."); },
  () => { const n = ri(5, 12); return num("g", `${n} people each throw their hat into a pile and grab one at random. Expected number who get their own hat?`, 1, `Each person gets their own hat with probability 1/${n}; by linearity the expected number is ${n} × 1/${n} = 1, whatever the number of people.`, "Indicators again."); },
  () => GEN.complement(),
  () => GEN.bayesTest(),
  () => GEN.condDice(),
];
export function puzzleSet(dateKey, solvedIds) {
  // Same 5 for the whole day: 3 bank puzzles you haven't solved (a different 3 each day), plus 2 generated ones.
  let h = 0; for (const ch of dateKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const unsolved = PUZZLE_BANK.filter((p) => !solvedIds.includes(p.id));
  const pool = unsolved.length >= 3 ? unsolved : PUZZLE_BANK;
  const picks = [];
  for (let i = 0; picks.length < Math.min(3, pool.length); i++) { const p = pool[(h + i * 7) % pool.length]; if (!picks.includes(p)) picks.push(p); }
  return picks;
}
export const genPuzzle = () => { const p = pick(PGEN)(); return { ...p, id: "g-" + Math.random().toString(36).slice(2, 7) }; };

// Number sequences: find the next term.
export function genSequence() {
  const t = ri(0, 7), s0 = ri(1, 9);
  let seq, rule;
  if (t === 0) { const d = ri(3, 12); seq = Array.from({ length: 6 }, (_, i) => s0 + i * d); rule = `add ${d} each time`; }
  else if (t === 1) { const r = ri(2, 3); seq = Array.from({ length: 6 }, (_, i) => s0 * r ** i); rule = `multiply by ${r}`; }
  else if (t === 2) { const c = ri(-3, 5); seq = Array.from({ length: 6 }, (_, i) => (i + 1) ** 2 + c); rule = `n² ${c >= 0 ? "+" : "−"} ${Math.abs(c)}`; }
  else if (t === 3) { const a = ri(1, 4), b = ri(1, 5); seq = [a, b]; while (seq.length < 7) seq.push(seq.at(-1) + seq.at(-2)); rule = "each term is the sum of the previous two"; }
  else if (t === 4) { const d = ri(1, 3); seq = [s0]; for (let i = 1; i < 7; i++) seq.push(seq.at(-1) + d * i); rule = `the differences grow: +${d}, +${2 * d}, +${3 * d}, ...`; }
  else if (t === 5) { seq = Array.from({ length: 6 }, (_, i) => ((i + 1) * (i + 2)) / 2 + s0 - 1); rule = `triangular numbers${s0 > 1 ? ` + ${s0 - 1}` : ""} (differences 2, 3, 4, ...)`; }
  else if (t === 6) { const a = ri(2, 5), b = ri(1, 4); seq = [s0]; for (let i = 1; i < 7; i++) seq.push(i % 2 ? seq.at(-1) * a : seq.at(-1) + b); rule = `alternately × ${a} and + ${b}`; }
  else { const P = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31], k = ri(0, 3); seq = P.slice(k, k + 7).map((p) => p + s0 - 2); rule = `consecutive primes${s0 - 2 ? ` ${s0 - 2 > 0 ? "+" : "−"} ${Math.abs(s0 - 2)}` : ""}`; }
  const shown = seq.slice(0, seq.length - 1), ans = seq.at(-1);
  return { q: `What comes next?  ${shown.join(", ")}, ?`, type: "num", a: ans, sol: `${ans}: ${rule}.`, hint: "Look at the differences between terms, then the differences of those." };
}

// Expected-value bets: take it or pass?
export function genBet() {
  const games = [
    () => { const t = ri(8, 11); let c = 0; for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (x + y >= t) c++; return { desc: `Roll two dice. If the sum is ${t} or more you win`, p: c / 36, pdesc: `${c}/36` }; },
    () => { const k = ri(2, 4); return { desc: `Flip ${k} coins. If they're all heads you win`, p: 1 / 2 ** k, pdesc: `1/${2 ** k}` }; },
    () => ({ desc: "Draw a card. If it's a face card (J, Q, K) you win", p: 12 / 52, pdesc: "12/52 = 3/13" }),
    () => ({ desc: "Draw a card. If it's a heart you win", p: 1 / 4, pdesc: "1/4" }),
    () => { const n = ri(2, 4); const p = 1 - (5 / 6) ** n; return { desc: `Roll ${n} dice. If at least one shows a 6 you win`, p, pdesc: `1 − (5/6)^${n} ≈ ${r4(p)}` }; },
    () => ({ desc: "Roll a die. If it's a 1 or 2 you win", p: 1 / 3, pdesc: "1/3" }),
  ];
  const g = pick(games)();
  const fair = (1 - g.p) / g.p, win = Math.max(1, Math.round(fair * (0.6 + Math.random() * 0.8))), lose = 1;
  let ev = g.p * win - (1 - g.p) * lose;
  if (Math.abs(ev) < 0.02) return genBet();
  const take = ev > 0;
  return { q: `${g.desc} $${win}; otherwise you lose $${lose}. Take the bet?`, type: "mc", choices: ["Take it", "Pass"], a: take ? 0 : 1,
    sol: `P(win) = ${g.pdesc}. EV = P(win)·${win} − P(lose)·${lose} = ${r4(g.p)}·${win} − ${r4(1 - g.p)}·1 = ${ev >= 0 ? "+" : ""}${r4(ev)} per bet, so ${take ? "take it" : "pass"}. Break-even payout would be ${r4(fair)} to 1.`,
    hint: "EV = P(win) × payout − P(lose) × stake. Take it if EV > 0." };
}

// Probability blitz: fast, simple problems against the clock.
export function genBlitz() {
  const t = ri(0, 4);
  if (t === 0) return GEN.diceSum();
  if (t === 1) { const n = ri(2, 5), k = ri(0, n); return { q: `Flip ${n} fair coins. P(exactly ${k} heads)?`, type: "num", a: C(n, k) / 2 ** n, sol: `C(${n},${k})/2^${n} = ${C(n, k)}/${2 ** n}.` }; }
  if (t === 2) { const c = pick([["an ace", 4], ["a heart", 13], ["a red card", 26], ["a face card", 12], ["the queen of spades", 1]]); return { q: `Draw one card. P(${c[0]})?`, type: "num", a: c[1] / 52, sol: `${c[1]}/52.` }; }
  if (t === 3) { const n = ri(2, 4); return { q: `Roll ${n} dice. P(no sixes)?`, type: "num", a: (5 / 6) ** n, sol: `(5/6)^${n}.` }; }
  const a = pick([0.2, 0.3, 0.5]), b = pick([0.4, 0.5, 0.6]); return { q: `Independent events with P(A) = ${a}, P(B) = ${b}. P(A and B)?`, type: "num", a: a * b, sol: `${a} × ${b} = ${r4(a * b)}.` };
}
