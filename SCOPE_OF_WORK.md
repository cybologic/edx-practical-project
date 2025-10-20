Project XBlock — Scope of Work

Overview
--------
This XBlock implements a "Course Project" with milestones. Each milestone may require either a written (rich text) submission or a code submission (IDE). The XBlock supports:

- Configurable: project title, total milestones, lessons per milestone, milestone descriptions, and milestone types (text/code).
- Student UI: milestone list, per-milestone editor (rich-text or code IDE), load/save submissions, mark milestones complete, project completion tracking.
- Workbench-ready: student view updated; can be installed editable into the xblock-sdk workbench for testing.

Current status (what's implemented)
-----------------------------------
Files changed (key):
- projectxblock/projectxblock/projectxblock.py
  - Added settings fields: `project_title`, `total_milestones`, `lessons_per_milestone`, `milestone_descriptions`, `milestone_types`.
  - Added user_state fields: `completed_milestones`, `completed_lessons`, `project_completed`, `student_submissions`, `count`.
  - Added JSON handlers: `update_lesson_progress`, `get_milestone`, `save_submission`, `complete_milestone`, `increment_count`.
  - Student view initializes JS settings/state.

- projectxblock/projectxblock/static/html/projectxblock.html
  - Student HTML updated to include milestone container and CDN links for Quill and Ace editors (Quill CSS/JS and Ace JS). HTML no longer has the stray editor placeholder.

- projectxblock/projectxblock/static/js/src/projectxblock.js
  - Rewrote rendering to build the milestone list, per-milestone controls, and editor area.
  - Added per-milestone editors: Quill for rich text (with a fallback contentEditable) and Ace for IDE mode (via CDN).
  - Added a mode selector (Text / IDE) that appears inside the editor area when opened.
  - Handlers to load/save content per milestone using the new JSON endpoints.
  - Fixed several JS bugs (closure capture, layout issues).

- projectxblock/projectxblock/static/css/projectxblock.css
  - Styles for milestone layout, editor area, controls, and responsive behavior.

What to test (manual steps)
---------------------------
1. Activate your virtualenv and install the package in editable mode (if not already):

```bash
source /Users/ayesha/Desktop/xblock_development/venv/bin/activate
cd /Users/ayesha/Desktop/xblock_development/projectxblock
pip install -e . --no-build-isolation
```

2. Start the xblock-sdk workbench (from the xblock-sdk directory):

```bash
cd /Users/ayesha/Desktop/xblock_development/xblock-sdk
python3 manage.py migrate --noinput
python3 manage.py runserver 8000
```

3. Open the Workbench at http://127.0.0.1:8000/ and add the `ProjectXBlock` scenario. Use the student preview.

4. Verifications:
- Milestones render with number + title on left and controls on right.
- Click "Open Editor" — the editor opens and a small "Text / IDE" select appears under the button.
- Select Text: Quill should display with toolbar (if CDN loads) or fallback editable area if Quill is blocked. Type and click Save. Use Load to retrieve it.
- Select IDE: Ace should load (if CDN allowed). Type code and Save; Load should repopulate.
- Click "Mark done" — it marks milestone complete and updates `count` shown at the bottom.
- Use browser console to dispatch the simulate event to test lesson unlocks:

```javascript
$(document).trigger('simulateLessonComplete', [{ completed_lessons: 4 }]);
```

Notes and known issues
----------------------
- The implementation uses CDN-hosted Quill and Ace. If your environment blocks CDNs, editors will not initialize. We added a fallback contentEditable for the text editor, but IDE requires Ace. Option: vendor Quill/Ace into `static/` and reference them locally.
- The current Ace initialization mounts on a `textarea` — switching to an explicit div for Ace gives better results; recommended next step.
- Studio (author) view is not implemented yet. Milestone descriptions/types must be edited in code or via `projectxblock` settings for now.
- Save/load stores simple dictionaries in `student_submissions` (content, language, saved_at). No versioning or grading yet.

Next recommended tasks (priority)
---------------------------------
1. Replace Ace mount target with a div and add a language selector per milestone (python/js/html), wire Ace mode accordingly.
2. Vendor Quill and Ace into static files for offline/CSP-safe operation.
3. Implement `studio_view` to allow authors to edit `milestone_descriptions` and `milestone_types` in Studio and save to settings.
4. Add autosave / draft indicator and submission history per milestone.
5. Add instructor review UI (studio) to comment/grade submissions.

Appendix: Key symbols & handlers
--------------------------------
- XBlock fields: see `projectxblock.py` (search for `milestone_types`, `student_submissions`, `completed_milestones`).
- JSON handlers available to JS: `update_lesson_progress`, `get_milestone`, `save_submission`, `complete_milestone`, `increment_count`.

Contact & Handover
------------------
If a dev picks this up:
- Start by running the workbench and opening the student preview as described above.
- Use browser dev tools to watch network requests for `/handler/` calls when Save/Load/Complete actions are performed.
- If editors do not appear, check browser console for CSP or network errors blocking CDN resources.
