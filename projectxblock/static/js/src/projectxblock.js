/* Javascript for ProjectXBlock with milestones. */
function ProjectXBlock(runtime, element, settings) {
  function updateCount(result) {
    $(".count", element).text(result.count);
  }

  var incUrl = runtime.handlerUrl(element, "increment_count");

  $(".count", element)
    .closest("p")
    .click(function (eventObject) {
      $.ajax({
        type: "POST",
        url: incUrl,
        data: JSON.stringify({ hello: "world" }),
        contentType: "application/json; charset=utf-8",
        success: updateCount,
      });
    });

  // Render milestones with editor support
  function renderMilestones(state) {
    var list = $("#milestones-list", element);
    list.empty();
    for (var i = 0; i < state.total_milestones; i++) {
      var completed = (state.completed_milestones || []).includes(i);
      var item = $('<div class="milestone-item"/>');
      if (completed) item.addClass("completed");
      // main area (left): number + title
      var main = $('<div class="milestone-main"/>');
      main.append(
        $('<div class="milestone-number">').text(completed ? "✓" : i + 1)
      );
      main.append(
        $('<div class="milestone-title">').text("Milestone " + (i + 1))
      );
      item.append(main);

      var btn = $("<button/>")
        .addClass("mark-btn")
        .text(completed ? "Completed" : "Mark done");
      (function (idx) {
        btn.click(function () {
          var url = runtime.handlerUrl(element, "complete_milestone");
          $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify({ milestone_index: idx }),
            contentType: "application/json; charset=utf-8",
          }).done(function (resp) {
            state.completed_milestones = resp.completed_milestones;
            if (typeof resp.count !== "undefined") {
              $(".count", element).text(resp.count);
            }
            if (resp.project_completed)
              $("#project-completion", element).show();
            renderMilestones(state);
          });
        });
      })(i);

      // Controls container: keeps buttons on the main row and prevents them
      // from being pushed by the editor area when it opens.
      var controls = $("<div class='milestone-controls' />");
      controls.append(btn);

      // Editor mode selector (Text or IDE) - defaults to Text.
      // We'll insert this into the editor area when the editor opens so it
      // appears under the Open Editor button.
      var modeSelect = $(
        "<select class='editor-mode'><option value='text'>Text</option><option value='ide'>IDE</option></select>"
      );

      // Editor UI
      var editorToggle = $("<button/>")
        .addClass("editor-toggle")
        .text("Open Editor");
      var editorArea = $('<div class="editor-area" style="display:none"/>');

      var desc = $('<div class="milestone-desc"/>').html(
        (state.milestone_descriptions && state.milestone_descriptions[i]) || ""
      );
      editorArea.append(desc);

      var mtype =
        state.milestone_types && state.milestone_types[i]
          ? state.milestone_types[i]
          : "text";
      if (mtype === "code") {
        var codeEditor = $(
          '<textarea class="code-editor" placeholder="Enter code here..."></textarea>'
        );
        editorArea.append(codeEditor);
      } else {
        // quill container: toolbar + editor
        var quillContainer = $("<div class='quill-container'></div>");
        var quillToolbar = $("<div class='quill-toolbar'></div>");
        quillToolbar.append(
          "<span class='ql-formats'><button class='ql-bold'></button><button class='ql-italic'></button><button class='ql-underline'></button></span>"
        );
        quillToolbar.append(
          "<span class='ql-formats'><button class='ql-list' value='ordered'></button><button class='ql-list' value='bullet'></button></span>"
        );
        var quillEditorDiv = $(
          "<div class='quill-editor' style='min-height:120px;'></div>"
        );
        quillContainer.append(quillToolbar);
        quillContainer.append(quillEditorDiv);
        editorArea.append(quillContainer);

        // Fallback editable div in case Quill is not available or failed to load
        var richEditor = $(
          '<div class="rich-editor" contenteditable="true" style="min-height:120px; border:1px solid #eee; padding:8px;"></div>'
        );
        // hide fallback by default; will be shown if Quill isn't available
        richEditor.hide();
        editorArea.append(richEditor);
      }

      var loadBtn = $("<button/>").addClass("load-btn").text("Load");
      var saveBtn = $("<button/>").addClass("save-btn").text("Save");

      (function (
        idx,
        editorAreaLocal,
        mtypeLocal,
        loadBtnLocal,
        saveBtnLocal,
        editorToggleLocal,
        controlsLocal
      ) {
        editorToggleLocal.click(function () {
          // If editor is already visible, close it and move controls back above editor
          if (editorAreaLocal.is(":visible")) {
            // remove the mode select from the editor area if present
            editorAreaLocal.find(".editor-mode").detach();
            // move controls back before the editor area
            editorAreaLocal.before(controlsLocal);
            editorAreaLocal.hide();
          } else {
            // open editor and move controls into the editor area so buttons appear below
            controlsLocal.appendTo(editorAreaLocal);

            // move the mode select into the editor area so it appears under Open Editor
            modeSelect.detach();
            editorAreaLocal.append(modeSelect);

            var chosenMode =
              editorAreaLocal.find(".editor-mode").val() || "text";
            // initialize Quill proactively if available and not already initialized
            try {
              var qdiv = editorAreaLocal.find(".quill-editor")[0];
              if (chosenMode === "text" && qdiv && window.Quill) {
                var instKey = "quill-instance-" + idx;
                var existing = editorAreaLocal.data(instKey);
                if (!existing) {
                  var toolbarElem = editorAreaLocal.find(".quill-toolbar")[0];
                  var quill = new Quill(qdiv, {
                    theme: "snow",
                    modules: { toolbar: toolbarElem },
                  });
                  editorAreaLocal.data(instKey, quill);
                  // if there's an existing submission, populate it
                  var sub = null;
                  try {
                    sub = state.student_submissions[idx];
                  } catch (e) {
                    sub = null;
                  }
                  if (sub && sub.content) quill.root.innerHTML = sub.content;
                  // hide fallback if present
                  editorAreaLocal.find(".rich-editor").hide();
                }
              } else if (chosenMode === "ide" && window.ace) {
                // initialize Ace editor inside editor area
                var aceDiv = editorAreaLocal.find(".code-editor")[0];
                if (aceDiv) {
                  var aceKey = "ace-instance-" + idx;
                  var existingAce = editorAreaLocal.data(aceKey);
                  if (!existingAce) {
                    var aceEditor = ace.edit(aceDiv);
                    aceEditor.setTheme("ace/theme/textmate");
                    aceEditor.session.setMode("ace/mode/python");
                    editorAreaLocal.data(aceKey, aceEditor);
                    // populate from saved submission
                    var sub2 = null;
                    try {
                      sub2 = state.student_submissions[idx];
                    } catch (e) {
                      sub2 = null;
                    }
                    if (sub2 && sub2.content)
                      aceEditor.setValue(sub2.content, -1);
                  }
                }
              } else {
                // Quill not available: show fallback editable div
                editorAreaLocal.find(".rich-editor").show();
              }
            } catch (err) {
              // fallback: show rich editor
              editorAreaLocal.find(".rich-editor").show();
            }

            editorAreaLocal.show();
          }
        });

        loadBtnLocal.click(function () {
          var url = runtime.handlerUrl(element, "get_milestone");
          $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify({ milestone_index: idx }),
            contentType: "application/json; charset=utf-8",
          }).done(function (resp) {
            if (!resp.success) return;
            var sub = resp.submission;
            if (mtypeLocal === "code") {
              // If IDE mode with Ace, set its value
              var aceEd = editorAreaLocal.data("ace-instance-" + idx);
              if (aceEd) {
                aceEd.setValue((sub && sub.content) || "", -1);
              } else {
                editorAreaLocal
                  .find(".code-editor")
                  .val((sub && sub.content) || "");
              }
            } else {
              // initialize quill if present and set HTML
              var qdiv = editorAreaLocal.find(".quill-editor")[0];
              if (qdiv && window.Quill) {
                var qId = "quill-" + idx;
                // store instance on editorAreaLocal.data
                var instance = editorAreaLocal.data("quill-instance-" + idx);
                if (!instance) {
                  var quill = new Quill(qdiv, {
                    theme: "snow",
                    modules: {
                      toolbar: editorAreaLocal.find(".quill-toolbar")[0],
                    },
                  });
                  editorAreaLocal.data("quill-instance-" + idx, quill);
                  instance = quill;
                }
                instance.root.innerHTML = (sub && sub.content) || "";
              } else {
                editorAreaLocal
                  .find(".rich-editor")
                  .html((sub && sub.content) || "");
              }
            }
          });
        });

        saveBtnLocal.click(function () {
          var url = runtime.handlerUrl(element, "save_submission");
          var content = "";
          var language = "";
          if (mtypeLocal === "code") {
            var aceEd2 = editorAreaLocal.data("ace-instance-" + idx);
            if (aceEd2) {
              content = aceEd2.getValue();
            } else {
              content = editorAreaLocal.find(".code-editor").val();
            }
            language = "text";
          } else {
            var instance = editorAreaLocal.data("quill-instance-" + idx);
            if (instance) {
              content = instance.root.innerHTML;
            } else {
              content = editorAreaLocal.find(".rich-editor").html();
            }
            language = "html";
          }
          var payload = {
            milestone_index: idx,
            content: content,
            language: language,
          };
          $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(payload),
            contentType: "application/json; charset=utf-8",
          }).done(function (resp) {
            if (resp.success) {
              saveBtnLocal.text("Saved").prop("disabled", true);
              setTimeout(function () {
                saveBtnLocal.text("Save").prop("disabled", false);
              }, 1200);
            }
          });
        });
      })(i, editorArea, mtype, loadBtn, saveBtn, editorToggle, controls);

      // append controls (mark, open, load, save) to the controls container
      controls.append(editorToggle);
      controls.append(loadBtn);
      controls.append(saveBtn);

      // append the controls row and then the editor area (editor-area takes full width)
      item.append(controls);
      item.append(editorArea);

      list.append(item);
    }
    if (state.project_completed) $("#project-completion", element).show();
  }

  // Initial state comes from settings param
  var state = {
    project_title: settings.project_title,
    total_milestones: settings.total_milestones,
    lessons_per_milestone: settings.lessons_per_milestone,
    milestone_descriptions: settings.milestone_descriptions || [],
    completed_milestones: settings.completed_milestones || [],
    completed_lessons: settings.completed_lessons || 0,
    project_completed: settings.project_completed || false,
    count: settings.count || 0,
  };

  // initialize displayed count
  $(".count", element).text(state.count);

  renderMilestones(state);

  // Example: simulate lesson completion via a custom event
  $(document).on("simulateLessonComplete", function (e, data) {
    var url = runtime.handlerUrl(element, "update_lesson_progress");
    $.post(
      url,
      JSON.stringify({ completed_lessons: data.completed_lessons })
    ).done(function (resp) {
      state.completed_milestones = resp.completed_milestones;
      state.project_completed = resp.project_completed;
      if (typeof resp.count !== "undefined") {
        $(".count", element).text(resp.count);
      }
      renderMilestones(state);
    });
  });
}
