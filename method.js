// "Why this works": the research behind the study method, shown in the app.
export const METHOD = {
  intro:
    "StudyQuest turns the best-supported findings in learning science, and the published evidence on AI tutoring, into one daily routine. Each rule below is a feature of the app.",
  rules: [
    {
      title: "1. Master a unit before moving on",
      body:
        "Alpha School's software only lets a student move to a new level after showing mastery of the previous one; the approach goes back to Benjamin Bloom's mastery-learning research from 1968. Here, every unit ends in a Boss fight: fresh problems, closed book, 80%+ to pass.",
      sources: [
        ["DeepLearning.AI: Inside Alpha School", "https://www.deeplearning.ai/the-batch/inside-alpha-school-a-texas-based-program-using-algorithms-and-video-monitors-to-teach-children"],
        ["Two Hour Learning explained", "https://beginnersinai.org/two-hour-learning-explained/"],
      ],
    },
    {
      title: "2. Test yourself instead of rereading",
      body:
        "A major review of ten study techniques (Dunlosky et al., 2013) rated practice testing and distributed practice as the two highest-utility methods; rereading and highlighting did not reliably help. So the app has almost no passive steps: you pre-test, practice, fight bosses and review cards.",
      sources: [["Dunlosky et al. (2013), Psychological Science in the Public Interest", "https://www.psychologicalscience.org/journals/pspi/1529100612453266/"]],
    },
    {
      title: "3. Space it out, automatically",
      body:
        "Reviews are scheduled with FSRS (default parameters), the open-source algorithm now built into Anki. It predicts when you're about to forget each card and shows it just before. A few minutes a day keeps everything you've learned.",
      sources: [
        ["Anki docs: SM-2 and FSRS", "https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm"],
        ["Benchmark of spaced-repetition algorithms", "https://expertium.github.io/Benchmark.html"],
      ],
    },
    {
      title: "4. Use AI as a tutor, never as an answer machine",
      body:
        "In a field experiment with nearly 1,000 high-school math students, unrestricted GPT-4 boosted practice scores, but those students then did 17% worse than the control group on an exam without AI. A version with tutoring guardrails avoided that harm. The local tutor here follows the same guardrails: hints, not solutions, one question at a time.",
      sources: [
        ["Bastani et al. (2025), PNAS", "https://ideas.repec.org/a/nas/journl/v122y2025pe2422633122.html"],
        ["Wharton summary", "https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education/"],
      ],
    },
    {
      title: "5. Struggle first, then get feedback",
      body:
        "In a randomized trial at Harvard, students learned more than twice as much, in less time, from a carefully designed AI tutor than from an active-learning class. The tutor was told to keep answers to a few sentences and to make students try before revealing answers. The app copies that design: short replies, attempt first.",
      sources: [
        ["Kestin et al. (2025), Scientific Reports", "https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/"],
        ["KQED summary", "https://www.kqed.org/mindshift/64694/an-ai-tutor-helped-harvard-students-learn-more-physics-in-less-time"],
      ],
    },
    {
      title: "6. Structure beats raw access",
      body:
        "A six-week World Bank trial in Nigeria used GPT-4 inside a structured after-school routine and raised English scores by 0.23 standard deviations. Structure, routine and guardrails were the point, which is why the app gives you one daily plan rather than an open chat box.",
      sources: [["World Bank Policy Research Working Paper 11125", "https://openknowledge.worldbank.org/entities/publication/15e1ff08-15ae-4f7a-b2a8-d146e6c113ee/full"]],
    },
    {
      title: "7. Short, focused daily blocks, with motivation built in",
      body:
        "Alpha's model is about two hours a day of focused, adaptive work, and its own materials say student motivation is the key to most of its success. StudyQuest keeps sessions short, rewards finishing them (XP, streaks, quests, bosses), and gives one rest day a week without breaking your streak.",
      sources: [["2 Hour Learning overview (Alpha School)", "https://cdnc.heyzine.com/flip-book/pdf/c0dacfa7175360f6fd39f6d36a2532684880ed6a-3.pdf"]],
    },
    {
      title: "8. Mix subjects every day",
      body:
        "Alpha's two hours cover several subjects, not one. The same review that backed testing and spacing rated interleaved practice (mixing topics instead of blocking them) as moderately useful, and it builds the skill of choosing the right method for a problem. So each day's session gives every active course a block, rotates which subject goes first, and mixes your reviews across subjects.",
      sources: [["Dunlosky et al. (2013)", "https://www.pubmed.gov/26173288/"]],
    },
    {
      title: "9. Apply it",
      body:
        "Every unit ends with a real task: code it, model a market, analyze Kazakh or Russian data. Transfer to a new situation is the hardest and most honest test of understanding.",
      sources: [],
    },
  ],
  caveat:
    "Honest caveats: Alpha School's results are largely self-reported, and critics argue the model isn't backed by independent research. The AI-tutor trials are short and specific (one physics course, one six-week program). A small local model also makes more mistakes than large cloud models, so check anything important against the notes and official solutions.",
  daily: [
    "Warm-up: one 2-minute mental-math run",
    "Reviews: every due card, mixed across subjects (~10–25 min)",
    "Subject blocks: 15–60 minutes for each active course, in a different order each day, each on the next step of that course's current unit",
    "A 5-minute break between blocks; one rest day a week keeps your streak alive",
  ],
};
