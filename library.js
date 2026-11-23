// Ready-made course packs you can switch on in Courses. Same format as an imported pack.
// Units without starter cards get them from the tutor ("Make cards") or by hand.

const OCW = "https://ocw.mit.edu/courses";
const G = `${OCW}/14-12-economic-applications-of-game-theory-fall-2012`;
const P = `${OCW}/14-13-psychology-and-economics-spring-2020`;
const ST = `${OCW}/18-650-statistics-for-applications-fall-2016`;
const M5 = `${OCW}/14-05-intermediate-macroeconomics-spring-2013`;
const F = `${OCW}/15-401-finance-theory-i-fall-2008`;
const Q = `${OCW}/18-s096-topics-in-mathematics-with-applications-in-finance-fall-2013`;
const MEHRLING = "https://www.coursera.org/learn/money-banking";

const r = (type, label, url, match) => ({ type, label, url, ...(match ? { match } : {}) });
const gNotes = (a, b) => r("notes", `14.12 lecture notes, chapters ${a}–${b}`, `${G}/pages/lecture-notes/`, `(lec|ch|chapter)[ _-]?0?(${Array.from({ length: b - a + 1 }, (_, i) => a + i).join("|")})(?!\\d)`);
const gHome = r("pset", "Problem sets and exams (with solutions)", `${G}/`, "(ps|pset|problem.?set|exam|quiz)");
const pSl = (slug, label, m) => r("notes", label, `${P}/resources/${slug}/`, m);
const stL = (n, title) => r("video", `18.650 L${n}: ${title}`, `${ST}/resources/${n === 1 ? "lecture-1-introduction-to-statistics" : `lecture-${n}-video`}/`, `(lec|lecture)[ _-]?0?${n}(?!\\d)`);
const fT = (slug, label) => r("video", `15.401: ${label}`, `${F}/pages/video-lectures-and-slides/${slug}/`, slug.split("-")[0]);
const qL = (n, slug, label) => r("video", `18.S096 L${n}: ${label}`, `${Q}/resources/lecture-${n}-${slug}/`, `(lec|lecture)[ _-]?0?${n}(?!\\d)`);
const paper = (label, url) => r("book", label, url);

export const LIBRARY = [
  {
    id: "game", name: "Game theory", source: "MIT 14.12 Economic Applications of Game Theory (Fall 2012)", color: "#2bb673", emoji: "♟️",
    home: `${G}/`, fileTag: "14[._-]?12",
    units: [
      { title: "Decision theory, representing games, dominance", concepts: ["Expected utility", "Normal and extensive form", "Dominant strategies", "Iterated dominance"], resources: [gNotes(1, 4), gHome], apply: "Write the frontier-AI-lab race as a normal-form game: does anyone have a dominant strategy?" },
      { title: "Rationalizability and Nash equilibrium", concepts: ["Rationalizability", "Best responses", "Nash equilibrium", "Mixed strategies"], resources: [gNotes(5, 6), gHome], apply: "Find every Nash equilibrium of a 2-lab 'release now vs. wait' game, including mixed ones." },
      { title: "Applications: Cournot, Bertrand and more", concepts: ["Cournot competition", "Bertrand competition", "Strategic complements/substitutes"], resources: [gNotes(7, 8), gHome], apply: "Cournot model of two AI labs choosing compute: what happens as compute costs fall?" },
      { title: "Backward induction, bargaining, subgame perfection", concepts: ["Backward induction", "Rubinstein bargaining", "Subgame-perfect equilibrium", "Credible threats"], resources: [gNotes(9, 11), gHome], apply: "Model a wage negotiation when an AI can do the job: how does the outside option change the split?" },
      { title: "Repeated games and implicit cartels", concepts: ["Repeated games", "Discounting", "Folk theorem", "Collusion"], resources: [gNotes(12, 13), gHome], apply: "When could AI labs sustain a 'pause' agreement? Apply the folk theorem." },
      { title: "Incomplete information: Bayesian games and auctions", concepts: ["Bayesian Nash equilibrium", "Types and beliefs", "First- and second-price auctions"], resources: [gNotes(14, 15), gHome], apply: "Design a sealed-bid auction for scarce GPU time: which format raises more?" },
      { title: "Dynamic games with incomplete information, signaling", concepts: ["Perfect Bayesian equilibrium", "Signaling", "Separating vs. pooling"], resources: [gNotes(16, 16), gHome], apply: "What is a degree worth as a signal when AI can do the work? Sketch a Spence-style model." },
    ],
  },
  {
    id: "psych", name: "Psychology & economics", source: "MIT 14.13 Psychology and Economics (Spring 2020)", color: "#e0457b", emoji: "🧠",
    home: `${P}/`, videos: `${P}/video_galleries/video-lectures/`, fileTag: "14[._-]?13",
    units: [
      { title: "Overview and time preferences (theory)", concepts: ["Present bias", "Quasi-hyperbolic discounting", "Sophistication vs. naiveté"], resources: [pSl("mit14_13s20_lec1", "Slides L1", "lec0?1(?!\\d)"), pSl("mit14_13s20_lec2", "Slides L2", "lec0?2(?!\\d)"), pSl("mit14_13s20_lec3_4", "Slides L3–4", "lec0?3_0?4"), r("pset", "Problem sets", `${P}/pages/problemsets/`, "(ps|pset|problem.?set)")], apply: "Why do people under-save, and what happens to saving when work becomes optional?" },
      { title: "Time preferences (applications)", concepts: ["Commitment devices", "Procrastination", "Demand for commitment"], resources: [pSl("mit14_13s20_lec5_6", "Slides L5–6", "lec0?5_0?6")], apply: "Design a commitment device for your own study plan and predict how you'd game it." },
      { title: "Risk and reference-dependent preferences", concepts: ["Expected utility limits", "Loss aversion", "Prospect theory", "Reference points"], resources: [pSl("mit14_13s20_lec7_8", "Slides L7–8", "lec0?7_0?8"), pSl("mit14_13s20_lec9", "Slides L9", "lec0?9(?!\\d)")], apply: "Why do retail traders sell winners too early? Look for it in KASE's retail-heavy market." },
      { title: "Social preferences", concepts: ["Altruism", "Fairness and reciprocity", "Social image"], resources: [pSl("mit14_13s20_lecs11_13", "Slides L11–13", "lecs?11"), pSl("mit14_13s20_midtermreview", "Midterm review", "midterm"), r("pset", "Quizzes and exams", `${P}/pages/quizzes_exams/`, "(exam|quiz|midterm)")], apply: "Fairness and status when income no longer comes from work." },
      { title: "Attention, beliefs, learning, projection", concepts: ["Limited attention", "Motivated beliefs", "Learning biases", "Projection bias"], resources: [pSl("mit14_13s20_lec14", "Slides L14", "lec14"), pSl("mit14_13s20_lec15_16", "Slides L15–16", "lec15_16"), pSl("mit14_13s20_lec17", "Slides L17", "lec17")], apply: "How might attention markets change in an AI-saturated world?" },
      { title: "Identity, defaults, nudges, malleable preferences", concepts: ["Identity", "Defaults", "Framing", "Preference malleability"], resources: [pSl("mit14_13s20_lec18", "Slides L18", "lec18"), pSl("mit14_13s20_lec19", "Slides L19", "lec19"), pSl("mit14_13s20_lec20", "Slides L20", "lec20")], apply: "Pick one default in your own life and redesign it." },
      { title: "Poverty, happiness and policy", concepts: ["Scarcity mindset", "Subjective well-being", "Behavioral welfare economics"], resources: [pSl("mit14_13s20_lec21", "Slides L21", "lec21"), pSl("mit14_13s20_lec22", "Slides L22", "lec22"), pSl("mit14_13s20_lec23", "Slides L23", "lec23")], apply: "Happiness and meaning without work: a core section of your post-labor essay." },
    ],
  },
  {
    id: "stats", name: "Statistics", source: "MIT 18.650 Statistics for Applications (Fall 2016)", color: "#1f8ef1", emoji: "📊",
    home: `${ST}/`, fileTag: "18[._-]?650",
    units: [
      { title: "What statistics is; parametric inference", concepts: ["Estimators", "Consistency and bias", "Confidence intervals", "Delta method"], resources: [stL(1, "Introduction"), stL(2, "Introduction (cont.)"), stL(3, "Parametric inference")], apply: "Estimate the chance a Kazakh stock is up on a given day, with a confidence interval." },
      { title: "Maximum likelihood and method of moments", concepts: ["Likelihood", "MLE", "Fisher information", "Method of moments"], resources: [stL(4, "Inference and MLE"), stL(5, "MLE (cont.)"), stL(6, "MLE and method of moments")], apply: "Fit a t-distribution to returns by maximum likelihood and compare it with the Normal fit." },
      { title: "Hypothesis testing", concepts: ["Null and alternative", "Type I/II errors", "p-values", "Wald and likelihood-ratio tests"], resources: [stL(7, "Hypothesis testing"), stL(8, "Hypothesis testing (cont.)"), stL(9, "Hypothesis testing (cont.)")], apply: "Test properly whether a trading rule beats random." },
      { title: "Goodness of fit", concepts: ["Chi-square test", "Kolmogorov-Smirnov", "QQ plots"], resources: [stL(11, "Testing and goodness of fit"), stL(12, "Goodness of fit (cont.)")], apply: "Test whether daily returns are Normal and report the result honestly." },
      { title: "Regression", concepts: ["Least squares", "Gaussian linear model", "Inference on coefficients"], resources: [stL(13, "Regression"), stL(14, "Regression (cont.)"), stL(15, "Regression (cont.)")], apply: "Regress tenge moves on oil prices; interpret the coefficient, standard error and R²." },
      { title: "Bayesian statistics", concepts: ["Priors and posteriors", "Conjugacy", "Credible intervals"], resources: [stL(17, "Bayesian statistics"), stL(18, "Bayesian statistics (cont.)")], apply: "Update your belief in a strategy's edge as each trade comes in." },
      { title: "Principal component analysis", concepts: ["Covariance matrices", "Eigen-decomposition", "Dimension reduction"], resources: [stL(19, "PCA"), stL(20, "PCA (cont.)")], apply: "Run PCA on 20 stocks' returns: how much does the first component explain?" },
      { title: "Generalized linear models", concepts: ["Exponential families", "Link functions", "Logistic regression"], resources: [stL(21, "GLMs"), stL(22, "GLMs (cont.)"), stL(23, "GLMs (cont.)"), stL(24, "GLMs (cont.)")], apply: "Logistic regression: predict up/down days from a news signal." },
    ],
  },
  {
    id: "money", name: "Monetary theory", source: "Mehrling, Economics of Money and Banking (Columbia / Coursera) + MIT 14.05", color: "#d4a017", emoji: "🏦",
    home: MEHRLING, fileTag: "mehrling|money.?bank|14[._-]?05",
    units: [
      { title: "The money view and the hierarchy of money", concepts: ["Hierarchy of money", "Balance-sheet approach", "Banks, shadow banks, central banks"], resources: [r("video", "Modules 1–3 (free to audit)", MEHRLING)], apply: "Draw the T-accounts for a tenge payment from a Halyk customer to a Kaspi customer." },
      { title: "Payments, Fed funds, Eurodollars and FX", concepts: ["Survival constraint", "Fed funds market", "Eurodollars", "FX and covered interest parity"], resources: [r("video", "Modules 4–7", MEHRLING)], apply: "Map the National Bank of Kazakhstan's interest-rate corridor onto Mehrling's framework." },
      { title: "Repo, dealers and market liquidity", concepts: ["Repo", "Dealer balance sheets", "Funding vs. market liquidity"], resources: [r("video", "Modules 8–10", MEHRLING)], apply: "Explain the March 2020 Treasury-market 'dash for cash' in money-view terms." },
      { title: "Central banking and crises", concepts: ["Lender of last resort", "Dealer of last resort", "Bagehot's rule"], resources: [r("video", "Modules 11–13", MEHRLING)], apply: "One page: what does a central bank do if AI makes most goods nearly free?" },
      { title: "Monetary policy rules and crises (14.05)", concepts: ["Inflation bias", "Rules vs. discretion (Barro-Gordon)", "Multiple equilibria and crises"], resources: [r("notes", "Rules vs. discretion notes", `${M5}/resources/mit14_05s13_lecnot_bar-gor/`, "bar.?gor"), r("notes", "Crises notes", `${M5}/resources/mit14_05s13_lecnot_crises/`, "crises"), r("pset", "14.05 exams", `${M5}/pages/exams/`, "exam")], apply: "Apply Barro-Gordon to Kazakhstan's inflation targeting." },
    ],
  },
  {
    id: "aiecon", name: "Macro & the economics of AI", source: "MIT 14.05 growth models + research papers", color: "#8e44ad", emoji: "🤖",
    home: `${M5}/`, fileTag: "14[._-]?05|korinek|acemoglu|trammell|keynes|autor",
    units: [
      { title: "Growth models: Solow, Ramsey, endogenous growth", concepts: ["Solow model", "Ramsey model", "Endogenous growth"], resources: [r("notes", "Solow", `${M5}/resources/mit14_05s13_lecnot_int_sol/`, "int.?sol"), r("notes", "Ramsey", `${M5}/resources/mit14_05s13_lecnot_ramsey/`, "ramsey"), r("notes", "Endogenous growth", `${M5}/resources/mit14_05s13_lecnot_end-gro/`, "end.?gro")], apply: "Add AI capital that substitutes for labor to Solow: what happens to wages?" },
      { title: "Automation and new tasks", concepts: ["Task-based model", "Displacement effect", "Reinstatement effect"], resources: [paper("Acemoglu & Restrepo (2019)", "https://scholar.google.com/scholar?q=Acemoglu+Restrepo+Automation+and+New+Tasks+How+Technology+Displaces+and+Reinstates+Labor")], apply: "1-page memo: which effect wins after AGI, and why?" },
      { title: "Scenarios for the transition to AGI", concepts: ["Task complexity", "Automation vs. capital accumulation", "Wage collapse conditions"], resources: [paper("Korinek & Suh (2024), arXiv", "https://arxiv.org/abs/2403.12107")], apply: "Build your own scenario table for the post-labor essay." },
      { title: "Growth under transformative AI", concepts: ["Explosive growth", "Factor shares", "Bottlenecks"], resources: [paper("Trammell & Korinek (2023), NBER", "https://www.nber.org/papers/w31815")], apply: "Add a growth section to your post-labor essay." },
      { title: "Work, meaning and abundance", concepts: ["Technological unemployment", "Keynes's 15-hour week", "Work of the future"], resources: [paper("Keynes (1930)", "https://scholar.google.com/scholar?q=Keynes+Economic+Possibilities+for+our+Grandchildren"), paper("Autor (2019)", "https://scholar.google.com/scholar?q=Autor+Work+of+the+Past+Work+of+the+Future"), paper("Aghion, Jones & Jones", "https://scholar.google.com/scholar?q=Aghion+Jones+Jones+Artificial+Intelligence+and+Economic+Growth")], apply: "Finish the post-labor essay draft." },
    ],
  },
  {
    id: "finance", name: "Finance theory", source: "MIT 15.401 Finance Theory I (Fall 2008)", color: "#16a085", emoji: "💹",
    home: `${F}/`, fileTag: "15[._-]?401",
    units: [
      { title: "Introduction and present value", concepts: ["Time value of money", "Annuities and perpetuities", "Discount rates"], resources: [fT("introduction-and-course-overview", "Introduction"), fT("present-value-relations", "Present value relations")], apply: "Value a Kazakh government bond's cash flows by hand." },
      { title: "Fixed-income securities", concepts: ["Yields", "Term structure", "Duration"], resources: [fT("fixed-income-securities", "Fixed-income securities")], apply: "Compute the duration of a 5-year bond and what a 1% rate rise does to it." },
      { title: "Equities", concepts: ["Dividend discount model", "Growth opportunities", "P/E ratios"], resources: [fT("equities", "Equities")], apply: "Value a dividend-paying KASE stock with the dividend discount model." },
      { title: "Forwards and futures", concepts: ["No-arbitrage pricing", "Cost of carry", "Hedging"], resources: [fT("forward-and-futures-contracts", "Forward and futures contracts")], apply: "Price a KASE futures contract by no-arbitrage and compare with the market." },
      { title: "Options", concepts: ["Payoffs", "Put-call parity", "Binomial pricing"], resources: [fT("options", "Options")], apply: "Price a call with a one-step binomial tree, then check put-call parity." },
      { title: "Risk, return and portfolio theory", concepts: ["Diversification", "Efficient frontier", "Sharpe ratio"], resources: [fT("risk-and-return", "Risk and return"), fT("portfolio-theory", "Portfolio theory")], apply: "Build a minimum-variance portfolio of 5 stocks in Python." },
      { title: "CAPM, APT and capital budgeting", concepts: ["Beta", "Security market line", "Factor models", "NPV"], resources: [fT("the-capm-and-apt", "The CAPM and APT"), fT("capital-budgeting", "Capital budgeting")], apply: "Estimate Kazatomprom's beta and its implied cost of equity." },
      { title: "Efficient markets", concepts: ["Forms of efficiency", "Anomalies", "Behavioral critiques"], resources: [fT("efficient-markets", "Efficient markets"), fT("course-summary", "Course summary")], apply: "Argue for and against efficiency in KASE's retail-dominated market." },
    ],
  },
  {
    id: "quant", name: "Quant methods", source: "MIT 18.S096 Topics in Mathematics with Applications in Finance (Fall 2013)", color: "#c0392b", emoji: "📐",
    home: `${Q}/`, fileTag: "18[._-]?s096",
    units: [
      { title: "Financial terms, linear algebra, probability", concepts: ["Market basics", "Linear algebra for finance", "Probability review"], resources: [qL(1, "introduction-financial-terms-and-concepts", "Introduction"), qL(2, "linear-algebra", "Linear algebra"), qL(3, "probability-theory", "Probability theory")], apply: "Explain bid-ask, leverage and short selling to a friend." },
      { title: "Regression and value at risk", concepts: ["Regression in finance", "Value at risk", "Backtesting VaR"], resources: [qL(6, "regression-analysis", "Regression analysis"), qL(7, "value-at-risk-var-models", "Value at risk")], apply: "Compute 1-day 99% VaR for a portfolio three ways and compare." },
      { title: "Time series analysis", concepts: ["Stationarity", "AR/MA models", "Cointegration"], resources: [qL(8, "time-series-analysis-i", "Time series I"), qL(11, "time-series-analysis-ii", "Time series II"), qL(12, "time-series-analysis-iii", "Time series III")], apply: "Fit an AR model to returns in Python and explain the output." },
      { title: "Volatility and regularized models", concepts: ["GARCH", "Volatility clustering", "Regularization"], resources: [qL(9, "volatility-modeling", "Volatility modeling"), qL(10, "regularized-pricing-and-risk-models", "Regularized pricing and risk models")], apply: "Forecast next month's volatility for a stock you follow with GARCH." },
      { title: "Portfolio theory and factor models", concepts: ["Mean-variance optimization", "Factor models", "Portfolio management"], resources: [qL(14, "portfolio-theory", "Portfolio theory"), qL(15, "factor-modeling", "Factor modeling"), qL(16, "portfolio-management", "Portfolio management")], apply: "Run a 3-factor regression and decompose a fund's returns." },
      { title: "Stochastic processes and Itō calculus", concepts: ["Random walks", "Brownian motion", "Itō's lemma"], resources: [qL(5, "stochastic-processes-i", "Stochastic processes I"), qL(17, "stochastic-processes-ii", "Stochastic processes II"), qL(18, "ito-calculus", "Itō calculus")], apply: "Simulate geometric Brownian motion and check Itō's lemma numerically." },
      { title: "Black-Scholes and SDEs", concepts: ["Risk-neutral valuation", "Black-Scholes formula", "Stochastic differential equations"], resources: [qL(19, "black-scholes-formula-risk-neutral-valuation", "Black-Scholes"), qL(20, "option-price-and-probability-duality", "Option price and probability duality"), qL(21, "stochastic-differential-equations", "SDEs")], apply: "Derive Black-Scholes and price an option in Python; compare with a real quote." },
    ],
  },
];

// The format, for anyone (including an AI) writing a new pack.
export const PACK_PROMPT = `Make a StudyQuest course pack for this course: [PASTE COURSE NAME AND URL, e.g. an MIT OpenCourseWare course page].

Use the course's real lecture list, readings and problem sets. Output ONLY valid JSON in exactly this format:

{
  "id": "short-lowercase-id",
  "name": "Short course name",
  "source": "Institution, course number and term",
  "color": "#hex color",
  "emoji": "one emoji",
  "home": "course home URL",
  "fileTag": "regex that matches this course's file names, e.g. 6[._-]?006",
  "schedule": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "units": [
    {
      "title": "Unit title (group 2-4 lectures per unit; 6-12 units total)",
      "concepts": ["3-6 key concepts"],
      "resources": [
        { "type": "notes | video | pset | book", "label": "Lecture 1 notes", "url": "direct URL", "match": "regex for the file name, e.g. lec0?1(?!\\\\d)" }
      ],
      "cards": [ ["Question?", "Short, correct answer."] ],
      "apply": "One concrete real-world task that uses this unit"
    }
  ]
}

Rules: 4-8 cards per unit, one fact per card, answers under 30 words and accurate. Only use URLs you're confident exist; if unsure, use the course home URL.`;
