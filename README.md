ProjectXBlock — README

Quick start for developers
--------------------------
This README contains copyable commands to create a virtualenv, run the XBlock in the xblock-sdk workbench for development, and deploy the XBlock into an Open edX `edx-platform` environment.

Prerequisites
- Python 3.10+ (system or pyenv)
- git
- pip

Create a virtualenv (recommended)

```bash
# choose a path for your venv (example uses project root)
python3 -m venv /Users/ayesha/Desktop/xblock_development/venv
source /Users/ayesha/Desktop/xblock_development/venv/bin/activate

# upgrade pip
python -m pip install --upgrade pip setuptools wheel
```

Install and run the xblock-sdk workbench (development)

```bash
# from your project workspace
cd /Users/ayesha/Desktop/xblock_development/xblock-sdk
# install the workbench requirements into your active venv (if not already)
python -m pip install -r requirements/base.in || true

# install editable so workbench can pick up local XBlock changes
cd /Users/ayesha/Desktop/xblock_development/projectxblock
python -m pip install -e . --no-build-isolation

# run workbench
cd /Users/ayesha/Desktop/xblock_development/xblock-sdk
python3 manage.py migrate --noinput
python3 manage.py runserver 8000
```

Open http://127.0.0.1:8000/ in your browser and add the `ProjectXBlock` scenario; use the Student preview.

Development checks (manual)
- Milestone list shows number + title at left and action buttons (Completed/Mark/Open/Load/Save) at right.
- Click `Open Editor` -> a small mode select (Text / IDE) appears under the button.
  - Text: Quill rich-text editor will appear (if CDN allowed) or fallback contentEditable if not.
  - IDE: Ace editor will appear (requires CDN) or the code textarea fallback if Ace is blocked.
- Use `Load` and `Save` to persist content per milestone.
- Click `Mark done` to complete a milestone; bottom counter shows completed milestones.

Programmatic test (simulate lessons)

Open the browser console and dispatch the simulate event to test lesson-based unlocking:

```javascript
$(document).trigger('simulateLessonComplete', [{ completed_lessons: 4 }]);
```

Deployment to edx-platform (high-level steps)
--------------------------------------------
If you want to make this XBlock available inside an Open edX `edx-platform` instance, follow the steps below. Exact steps depend on your Open edX distribution and deployment tooling (Tutor, Ansible, devstack, etc.).

1) Package the XBlock

```bash
cd /Users/ayesha/Desktop/xblock_development/projectxblock
python setup.py sdist bdist_wheel
# note: editable installs are fine for dev but for edx-platform you typically
# install a released wheel into the platform's python environment or include
# it in a requirements file.
```

2) Install into edx-platform (example using a virtualenv for a local devstack)

```bash
# activate edx-platform's python environment or devstack container shell
pip install /path/to/dist/projectxblock-<version>.tar.gz
# or add the wheel/package to edx-platform requirements and rebuild
```

3) Register XBlock entry point (if needed)

Open `setup.py` in this package and ensure there is an entry point for `xblock.v1` so Open edX will discover your block. Example in `setup.py`:

```python
entry_points={
    'xblock.v1': [
        'projectxblock = projectxblock.projectxblock:ProjectXBlock',
    ],
},
```

4) Restart LMS and Studio services

After installing the package into the edx-platform environment, restart the LMS/Studio processes so the new XBlock is discovered.

Notes on production deployment
- Prefer vendoring Quill and Ace into `static/` in this package or into the platform static assets to avoid CDN/content security policy issues.
- Ensure static assets are collected (e.g., `python manage.py collectstatic`) if your release process requires it.
- Validate the package's entry point and Python package metadata (version, dependencies) before installing into a production environment.

Important files
- `projectxblock/projectxblock/projectxblock.py` — XBlock class, fields and JSON handlers.
- `projectxblock/projectxblock/static/html/projectxblock.html` — student view & static editor includes.
- `projectxblock/projectxblock/static/js/src/projectxblock.js` — UI rendering and AJAX handlers.
- `projectxblock/projectxblock/static/css/projectxblock.css` — styling.
- `projectxblock/SCOPE_OF_WORK.md` — conversation summary and developer notes.

Troubleshooting
- If Quill/Ace don't appear, open browser console for network/CSP errors. Consider vendoring the editors locally.
- If handlers fail, check network tab for POSTs to `/handler/` and server logs for tracebacks.

Next steps for contributors
- Vendor Quill/Ace into `static/` for CSP/offline safety.
- Replace Ace textarea with a `div` mount and add per-milestone language selector for proper Ace modes.
- Implement `studio_view` for configuring milestone descriptions/types in Studio.


