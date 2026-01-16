// Minimal script to enable editing/saving course descriptions (100-word limit).
// This script is framework-agnostic and will attach to elements when present.
// It expects course blocks in the DOM to include:
// - a container with class "course-block" and attribute data-course-code
// - a child element with class "course-description" containing the description text
// - a button with class "edit-course-desc" to trigger editing
//
// The app's existing roster rendering should create the course blocks; this file adds editing behavior.

(function () {
    function countWords(s) {
      if (!s) return 0;
      return s.trim().split(/\s+/).filter(Boolean).length;
    }
  
    async function saveCourseDescription(courseCode, description) {
      const resp = await fetch("/api/teacher/update_course_description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_code: courseCode, description }),
      });
      return resp.json();
    }
  
    function createEditorBlock(courseBlock) {
      const courseCode = courseBlock.dataset.courseCode;
      const descEl = courseBlock.querySelector(".course-description");
      const currentText = descEl ? descEl.textContent.trim() : "";
  
      const editor = document.createElement("div");
      editor.className = "description-editor";
  
      const textarea = document.createElement("textarea");
      textarea.value = currentText;
      textarea.rows = 5;
      textarea.style.width = "100%";
  
      const counter = document.createElement("div");
      counter.className = "word-counter";
      counter.textContent = `Words: ${countWords(textarea.value)} / 100`;
  
      const controls = document.createElement("div");
      controls.style.marginTop = "6px";
  
      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.textContent = "Save";
      saveBtn.style.marginRight = "8px";
  
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancel";
  
      controls.appendChild(saveBtn);
      controls.appendChild(cancelBtn);
  
      editor.appendChild(textarea);
      editor.appendChild(counter);
      editor.appendChild(controls);
  
      function updateCounter() {
        counter.textContent = `Words: ${countWords(textarea.value)} / 100`;
      }
      textarea.addEventListener("input", updateCounter);
  
      cancelBtn.addEventListener("click", () => {
        editor.remove();
        if (descEl) descEl.style.display = "";
      });
  
      saveBtn.addEventListener("click", async () => {
        const desc = textarea.value.trim();
        const wc = countWords(desc);
        if (wc > 100) {
          alert(`Description is too long (${wc} words). Max 100 words.`);
          return;
        }
        saveBtn.disabled = true;
        try {
          const res = await saveCourseDescription(courseCode, desc);
          if (res && res.ok) {
            if (descEl) {
              descEl.textContent = desc || "No description yet.";
              descEl.style.display = "";
            }
            editor.remove();
          } else {
            alert("Save failed: " + (res && res.error ? res.error : "unknown"));
          }
        } catch (err) {
          console.error(err);
          alert("Network error while saving.");
        } finally {
          saveBtn.disabled = false;
        }
      });
  
      return editor;
    }
  
    // Attach click handler to edit buttons; supports dynamic content
    document.addEventListener("click", function (ev) {
      const btn = ev.target.closest(".edit-course-desc");
      if (!btn) return;
      const courseBlock = btn.closest(".course-block");
      if (!courseBlock) return;
  
      // avoid creating multiple editors
      if (courseBlock.querySelector(".description-editor")) return;
  
      const descEl = courseBlock.querySelector(".course-description");
      if (descEl) descEl.style.display = "none";
  
      const editor = createEditorBlock(courseBlock);
      courseBlock.appendChild(editor);
    });
  })();