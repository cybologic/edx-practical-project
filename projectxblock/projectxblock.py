"""TO-DO: Write a description of what this XBlock is."""

from importlib.resources import files

from web_fragments.fragment import Fragment
from xblock.core import XBlock
from xblock.fields import Integer, Scope, String, List, Boolean
from datetime import datetime


class ProjectXBlock(XBlock):
    """
    TO-DO: document what your XBlock does.
    """

    # Fields are defined on the class.  You can access them in your code as
    # self.<fieldname>.

    # Core demo field (kept for compatibility)
    count = Integer(
        default=0, scope=Scope.user_state,
        help="A simple counter, to show something happening",
    )

    # Project/milestone configuration (studio settings)
    project_title = String(
        display_name="Project Title",
        default="Course Project",
        scope=Scope.settings,
        help="Overall project title"
    )

    total_milestones = Integer(
        display_name="Total Milestones",
        default=5,
        scope=Scope.settings,
        help="Number of milestones in the project"
    )

    lessons_per_milestone = Integer(
        display_name="Lessons Per Milestone",
        default=2,
        scope=Scope.settings,
        help="Number of lessons between each milestone"
    )

    milestone_descriptions = List(
        display_name="Milestone Descriptions",
        default=[],
        scope=Scope.settings,
        help="Description for each milestone"
    )

    # Per-milestone type configuration: either 'text' or 'code' (studio editable)
    milestone_types = List(
        display_name="Milestone Types",
        default=[],
        scope=Scope.settings,
        help="Type for each milestone: 'text' or 'code'"
    )

    # Student-specific progress
    completed_milestones = List(
        default=[],
        scope=Scope.user_state,
        help="List of completed milestone indices"
    )

    completed_lessons = Integer(
        default=0,
        scope=Scope.user_state,
        help="Number of lessons completed by student"
    )

    project_completed = Boolean(
        default=False,
        scope=Scope.user_state,
        help="Whether the entire project is completed"
    )

    # Student submissions per milestone. Each entry is a dict-like object
    # (e.g. {'content': '...', 'language': 'python', 'saved_at': '...'})
    student_submissions = List(
        default=[],
        scope=Scope.user_state,
        help="Per-milestone submissions saved by the student"
    )

    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        return files(__package__).joinpath(path).read_text(encoding="utf-8")

    # TO-DO: change this view to display your data your own way.
    def student_view(self, context=None):
        """
        The primary view of the ProjectXBlock, shown to students
        when viewing courses.
        """
        # Use enhanced student HTML that includes milestone UI
        html = self.resource_string("static/html/projectxblock.html")
        frag = Fragment(html.format(self=self))
        frag.add_css(self.resource_string("static/css/projectxblock.css"))
        frag.add_javascript(self.resource_string("static/js/src/projectxblock.js"))
        # initialize with milestone settings and state
        # Ensure student_submissions length matches total_milestones
        try:
            # extend with None entries if shorter
            while len(self.student_submissions) < self.total_milestones:
                self.student_submissions.append(None)
        except Exception:
            # field may be uninitialized or not list-like; reset safely
            self.student_submissions = [None] * self.total_milestones

        frag.initialize_js('ProjectXBlock', {
            'project_title': self.project_title,
            'total_milestones': self.total_milestones,
            'lessons_per_milestone': self.lessons_per_milestone,
            'milestone_descriptions': self.milestone_descriptions,
            'milestone_types': self.milestone_types,
            'completed_milestones': self.completed_milestones,
            'completed_lessons': self.completed_lessons,
            'project_completed': self.project_completed,
            'count': self.count,
            'student_submissions': self.student_submissions,
        })
        return frag

    # TO-DO: change this handler to perform your own actions.  You may need more
    # than one handler, or you may not need any handlers at all.
    @XBlock.json_handler
    def increment_count(self, data, suffix=''):
        """
        An example handler, which increments the data.
        """
        # Just to show data coming in...
        assert data['hello'] == 'world'

        self.count += 1
        return {"count": self.count}

    @XBlock.json_handler
    def update_lesson_progress(self, data, suffix=''):
        """Called to increment the student's completed lessons count and update milestones."""
        completed_count = int(data.get('completed_lessons', 0))
        self.completed_lessons = completed_count

        # Determine how many milestones should be unlocked based on lessons
        unlocked = min(self.total_milestones, completed_count // max(1, self.lessons_per_milestone))

        # Mark unlocked milestones as completed if appropriate (this is a simple model)
        self.completed_milestones = list(range(unlocked))

        if unlocked >= self.total_milestones:
            self.project_completed = True

        # update the demo counter to reflect completed milestones
        try:
            self.count = len(self.completed_milestones)
        except Exception:
            self.count = 0

        return {
            'success': True,
            'completed_milestones': self.completed_milestones,
            'current_milestone': unlocked,
            'project_completed': self.project_completed,
            'count': self.count,
        }

    @XBlock.json_handler
    def get_milestone(self, data, suffix=''):
        """Return milestone metadata and any existing student submission."""
        idx = int(data.get('milestone_index', 0))
        if idx < 0 or idx >= self.total_milestones:
            return {'success': False, 'error': 'invalid_index'}

        desc = None
        try:
            desc = self.milestone_descriptions[idx]
        except Exception:
            desc = ''

        mtype = 'text'
        try:
            mtype = self.milestone_types[idx] if idx < len(self.milestone_types) else 'text'
        except Exception:
            mtype = 'text'

        submission = None
        try:
            submission = self.student_submissions[idx]
        except Exception:
            submission = None

        return {'success': True, 'description': desc, 'type': mtype, 'submission': submission}

    @XBlock.json_handler
    def save_submission(self, data, suffix=''):
        """Save a student's submission for a milestone."""
        idx = int(data.get('milestone_index', 0))
        if idx < 0 or idx >= self.total_milestones:
            return {'success': False, 'error': 'invalid_index'}

        content = data.get('content', '')
        language = data.get('language', '')

        entry = {
            'content': content,
            'language': language,
            'saved_at': datetime.utcnow().isoformat() + 'Z'
        }

        # ensure list is long enough
        if not isinstance(self.student_submissions, list):
            self.student_submissions = []

        while len(self.student_submissions) <= idx:
            self.student_submissions.append(None)

        self.student_submissions[idx] = entry

        return {'success': True, 'submission': entry}

    @XBlock.json_handler
    def complete_milestone(self, data, suffix=''):
        idx = int(data.get('milestone_index', 0))
        if idx not in self.completed_milestones:
            self.completed_milestones.append(idx)
            self.completed_milestones.sort()
        if len(self.completed_milestones) >= self.total_milestones:
            self.project_completed = True
        # update demo counter
        try:
            self.count = len(self.completed_milestones)
        except Exception:
            self.count = 0

        return {'success': True, 'completed_milestones': self.completed_milestones, 'project_completed': self.project_completed, 'count': self.count}

    # TO-DO: change this to create the scenarios you'd like to see in the
    # workbench while developing your XBlock.
    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("ProjectXBlock",
             """<projectxblock/>
             """),
            ("Multiple ProjectXBlock",
             """<vertical_demo>
                <projectxblock/>
                <projectxblock/>
                <projectxblock/>
                </vertical_demo>
             """),
        ]
