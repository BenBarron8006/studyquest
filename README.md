# StudyQuest — install on your iPad

StudyQuest is an offline web app. It needs to be served once from an HTTPS address; after you add it to your Home Screen and open it, it runs without internet.

## 1. Put it online once (free, about 10 minutes, on your computer)

**GitHub Pages (permanent, recommended)**
1. Create a free account at github.com if you don't have one.
2. Click **New repository**, name it `studyquest`, set it to **Public**, and create it.
3. On the repository page, click **uploading an existing file**, then drag in everything inside this folder (all files; there are no subfolders). Click **Commit changes**.
4. Go to **Settings → Pages**, set **Source** to `Deploy from a branch`, choose `main` and `/ (root)`, and save.
5. After a minute, your app is at `https://YOUR-USERNAME.github.io/studyquest/`.

## 2. Install it on the iPad

1. Open that address in **Safari** (iPadOS 26 or later, for the local AI tutor).
2. Tap **Share → Add to Home Screen**, keep **Open as Web App** on, and tap **Add**.
3. Open StudyQuest from the Home Screen. Everything in the app is now stored on the iPad.

## 3. One-time downloads (on Wi-Fi)

- **AI tutor:** open **Tutor → Load model**. The recommended Qwen 3.5 2B model is about 1.1 GB and downloads once; after that it loads offline.
- **Course materials:** in Safari, download the PDFs you want (or an MIT OpenCourseWare course `.zip` from the course page's **Download course** button), then use **More → Library → Import**. Files whose names match a lecture are filed automatically; the rest you can assign by hand. Stat 110 lecture videos are YouTube links and need internet.

## 4. Keep your progress safe

Progress lives only on this iPad. Use **More → Settings → Export progress** every week or two and save the file to iCloud Drive. Tap **Protect storage** once.

## Updating (e.g. v1 → v2)

In your GitHub repository, click **Add file → Upload files**, drag in every file and folder from the new version (same names overwrite the old ones), and commit. Open the app once while online; it picks up the new version. Your progress stays, because it's stored on the iPad, not in the files.

## Adding courses

**More → Courses** offers four ways:
- **From an MIT OCW .zip:** on any OCW course page, click **Download course**, then pick the .zip in the app. It reads the course's PDFs and their titles, groups lectures into units, attaches problem sets and exams, and opens an editor so you can check everything before saving. (OCW zips don't include videos.)
- **Import a course pack:** a .json file in StudyQuest's format.
- **Paste pack JSON:** copy the built-in prompt, give it to Claude with a course name and URL, and paste the result. This works for any course, not just MIT's.
- **Build by hand** in the editor.

Seven ready-made packs are included (game theory, psychology & economics, statistics, monetary theory, macro & AI economics, finance, quant methods). Switch them on in Courses or on the Map.

## The daily session

The Today screen splits your daily time (set separately for term and break) across every active course, weighted by each course's priority, how far behind its target dates it is, and how much time it got in the past week. The order rotates every day. Start a block and the timer logs the time to that course; finishing 70% of a block's time completes it.

## Licenses

MIT OpenCourseWare materials are CC BY-NC-SA; Stat 110 materials © Joseph Blitzstein and Jessica Hwang. Imported files stay on your device for personal study. Bundled libraries: WebLLM (Apache-2.0), pdf.js (Apache-2.0), JSZip (MIT).

## Syncing the iPad and the website

The same GitHub Pages address works in any desktop browser (Chrome works well, including the local AI tutor). To keep devices in step, open **Settings → Sync across devices** on each one and paste a GitHub token that has only the *gist* scope. Your progress is stored in a secret Gist on your account and merges automatically: reviews, steps, minutes and XP from both devices are combined. Imported PDFs and the downloaded AI model stay on each device.
