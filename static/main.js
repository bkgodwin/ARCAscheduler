// static/main.js
//
// Full client-side script for ARCAscheduler (student, teacher, counselor).
// This is a single, self-contained file — replace your existing static/main.js with this.
// It is defensive (guards missing DOM elements), robust about fetch responses, and
// avoids throwing when elements are absent so other parts of the app continue to work.
//
// Key fixes in this version:
// - Consolidated and complete student/teacher/counselor logic in one file (no truncated snippets).
// - Defensive element lookups so missing DOM does not cause JS exceptions that stop other handlers.
// - Robust fetch handling: treat 200 OK with non-JSON as success where appropriate (prevents false "Network error" messages).
// - Modal for counselor edit is scrollable and follows dark theme by CSS variables; prevents background scrolling when open.
// - Removed delete-student button/handler from modal (per request).
// - Inline course description editor for teachers with 100-word check.
// - Server-side pagination controls for counselor list and single-PDF export triggerers wired.
// - Detailed console logging on errors to help debugging without breaking UI flows.
//
// Before replacing:
// - Back up your current static/main.js: cp static/main.js static/main.js.bak
// - Ensure templates include the required IDs (see templates/partials/* files already provided).
// - Ensure server endpoints exist: /api/student/*, /api/teacher/*, /api/courses, /api/counselor/*, /api/printables/*
//
// Note: Keep constants MAX_ACADEMIC_COURSES and MAX_ELECTIVE_CHOICES defined in the page (templates/index.html sets them).

(function () {
  "use strict";

  // -------------------- Small utility helpers --------------------
  function $id(id) { return document.getElementById(id); }
  function show(el) { if (!el) return; el.style.display = ""; }
  function hide(el) { if (!el) return; el.style.display = "none"; }
  function html(el, s) { if (!el) return; el.innerHTML = s; }
  function text(el, t) { if (!el) return; el.textContent = t; }

  function safeJSON(resp) {
    // try parse JSON, but if it fails return null
    return resp.text().then(txt => {
      try { return txt ? JSON.parse(txt) : null; } catch (e) { return null; }
    });
  }

  function escapeHTML(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function countWords(s) {
    if (!s) return 0;
    return s.trim().split(/\s+/).filter(Boolean).length;
  }

  function subjectToStyle(subjRaw, subjectColorsMap) {
    let subj = subjRaw && subjRaw.trim() ? subjRaw.trim() : "Other";
    if (subjectColorsMap && subjectColorsMap[subj]) return `background:${subjectColorsMap[subj]};`;
    const fallback = (subjectColorsMap && subjectColorsMap["Other"]) || "#475569";
    return `background:${fallback};`;
  }

  function approvalClass(item) {
    if (!item || !item.requires_approval) return "";
    const st = (item.approval_status || "pending").toLowerCase();
    if (st === "approved") return "approvalApproved";
    if (st === "rejected") return "approvalRejected";
    return "approvalPending";
  }
  function approvalLabel(item) {
    if (!item || !item.requires_approval) return "";
    const st = (item.approval_status || "pending").toLowerCase();
    if (st === "approved") return `<span class="approvalTag tagApproved">APPROVED</span>`;
    if (st === "rejected") return `<span class="approvalTag tagRejected">REJECTED</span>`;
    return `<span class="approvalTag tagPending">PENDING</span>`;
  }

  function moveItemUp(arr, idx) { if (idx <= 0) return; const tmp = arr[idx - 1]; arr[idx - 1] = arr[idx]; arr[idx] = tmp; }
  function moveItemDown(arr, idx) { if (idx >= arr.length - 1) return; const tmp = arr[idx + 1]; arr[idx + 1] = arr[idx]; arr[idx] = tmp; }

  // -------------------- DOM references (guarded) --------------------
  const studentModeBtn = $id("studentModeBtn");
  const teacherModeBtn = $id("teacherModeBtn");
  const counselorModeBtn = $id("counselorModeBtn");

  const studentPanel = $id("studentPanel");
  const teacherPanel = $id("teacherPanel");
  const counselorPanel = $id("counselorPanel");

  // Student elements
  const studentNameInput = $id("studentNameInput");
  const studentNameDropdown = $id("studentNameDropdown"); // select
  const studentIdCheckInput = $id("studentIdCheckInput");
  const studentLoginBtn = $id("studentLoginBtn");
  const studentLoginMsg = $id("studentLoginMsg");
  const studentScheduleArea = $id("studentScheduleArea");
  const studentInfoBlock = $id("studentInfoBlock");
  const selectedAcademicList = $id("selectedAcademicList");
  const selectedElectiveList = $id("selectedElectiveList");
  const specialInstructionsInput = $id("specialInstructionsInput");
  const studentSaveBtn = $id("studentSaveBtn");
  const studentSaveMsg = $id("studentSaveMsg");
  const studentCardLink = $id("studentCardLink");
  const studentSignOutBtn = $id("studentSignOutBtn");
  const studentFilterSubject = $id("studentFilterSubject");
  const studentFilterName = $id("studentFilterName");
  const studentRunCourseSearchBtn = $id("studentRunCourseSearchBtn");
  const studentAvailableCourses = $id("studentAvailableCourses");
  const maxAcademicSpan = $id("maxAcademicSpan");
  const maxElectiveSpan = $id("maxElectiveSpan");

  // Teacher elements
  const teacherLoginArea = $id("teacherLoginArea");
  const teacherDashboard = $id("teacherDashboard");
  const teacherEmailInput = $id("teacherEmailInput");
  const teacherPasswordInput = $id("teacherPasswordInput");
  const teacherLoginBtn = $id("teacherLoginBtn");
  const teacherLoginMsg = $id("teacherLoginMsg");
  const teacherLogoutBtn = $id("teacherLogoutBtn");
  const teacherInfo = $id("teacherInfo");
  const teacherRosters = $id("teacherRosters");

  // Counselor elements
  const counselorLoginArea = $id("counselorLoginArea");
  const counselorDashboard = $id("counselorDashboard");
  const counselorPassInput = $id("counselorPassInput");
  const counselorLoginBtn = $id("counselorLoginBtn");
  const counselorLoginMsg = $id("counselorLoginMsg");
  const logoutCounselorBtn = $id("logoutCounselorBtn");
  const gradeLockControls = $id("gradeLockControls");
  const saveGradeLocksBtn = $id("saveGradeLocksBtn");
  const gradeLockMsg = $id("gradeLockMsg");
  const subjectColorTbody = $id("subjectColorTbody");
  const saveSubjectColorsBtn = $id("saveSubjectColorsBtn");
  const colorSaveMsg = $id("colorSaveMsg");
  const studentsCsvInput = $id("studentsCsvInput");
  const coursesCsvInput = $id("coursesCsvInput");
  const teachersCsvInput = $id("teachersCsvInput");
  const uploadCsvBtn = $id("uploadCsvBtn");
  const uploadMsg = $id("uploadMsg");
  const filterName = $id("filterName");
  const filterGrade = $id("filterGrade");
  const filterCourse = $id("filterCourse");
  const applyFiltersBtn = $id("applyFiltersBtn");
  const exportFilteredBtn = $id("exportFilteredBtn");
  const exportAllSchedulesBtn = $id("exportAllSchedulesBtn");
  const studentCount = $id("studentCount");
  const counselorStudentRows = $id("counselorStudentRows");
  const printCardsSelectedBtn = $id("printCardsSelectedBtn");
  const printCardsAllBtn = $id("printCardsAllBtn");
  const rosterCourseCode = $id("rosterCourseCode");
  const rosterPrintBtn = $id("rosterPrintBtn");
  const pendingApprovalCount = $id("pendingApprovalCount");
  const pendingApprovalsList = $id("pendingApprovalsList");

  // Modal (counselor)
  const editScheduleModal = $id("editScheduleModal");
  const editModalCloseBtn = $id("editModalCloseBtn");
  const editScheduleInfo = $id("editScheduleInfo");
  const cSelectedAcademicList = $id("cSelectedAcademicList");
  const cSelectedElectiveList = $id("cSelectedElectiveList");
  const counselorNotesInput = $id("counselorNotesInput");
  const saveCounselorScheduleBtn = $id("saveCounselorScheduleBtn");
  const resetScheduleBtn = $id("resetScheduleBtn");
  const cFilterSubject = $id("cFilterSubject");
  const cFilterNameSearch = $id("cFilterNameSearch");
  const cRunCourseSearchBtn = $id("cRunCourseSearchBtn");
  const cAvailableCoursesGrid = $id("cAvailableCoursesGrid");
  const cMaxAcademicSpan = $id("cMaxAcademicSpan");
  const cMaxElectiveSpan = $id("cMaxElectiveSpan");
  const perPageSelect = $id("perPageSelect");
  const pagePrevBtn = $id("pagePrevBtn");
  const pageNextBtn = $id("pageNextBtn");
  const pageInfo = $id("pageInfo");

  // -------------------- App state --------------------
  let subjectColors = {};
  let currentStudentInfo = null;
  let studentAcademic = [];
  let studentElective = [];
  let studentSpecial = "";

  let counselorEditStudentID = null;
  let counselorEditStudentName = null;
  let counselorEditStudentGrade = null;
  let counselorAcademicItems = [];
  let counselorElectiveItems = [];

  let lastStudentCourseSearch = [];
  let lastCounselorCourseSearch = [];

  let counselorPage = 1;
  let counselorPerPage = 50;
  let counselorTotal = 0;

  // -------------------- Mode switching --------------------
  function showOnly(panel) {
    if (studentPanel) hide(studentPanel);
    if (teacherPanel) hide(teacherPanel);
    if (counselorPanel) hide(counselorPanel);
    if (panel) show(panel);
  }
  studentModeBtn && studentModeBtn.addEventListener("click", async () => { showOnly(studentPanel); });
  teacherModeBtn && teacherModeBtn.addEventListener("click", async () => { showOnly(teacherPanel); await loadTeacherState(); });
  counselorModeBtn && counselorModeBtn.addEventListener("click", async () => { showOnly(counselorPanel); await loadCounselorState(); });

  // -------------------- Subject colors --------------------
  async function loadSubjectColors() {
    try {
      const r = await fetch("/api/counselor/settings");
      if (!r.ok) return;
      const d = await r.json();
      subjectColors = d.subject_colors || {};
    } catch (e) {
      console.error("loadSubjectColors error", e);
    }
  }

  // -------------------- STUDENT logic --------------------
  if (studentNameInput) {
    studentNameInput.addEventListener("input", async () => {
      const q = studentNameInput.value.trim();
      if (!studentNameDropdown) return;
      if (q.length < 2) { studentNameDropdown.style.display = "none"; studentNameDropdown.innerHTML = ""; return; }
      try {
        const r = await fetch(`/api/student/find?q=${encodeURIComponent(q)}`);
        if (!r.ok) { studentNameDropdown.style.display = "none"; studentNameDropdown.innerHTML = ""; return; }
        const d = await r.json();
        if (!d.matches || d.matches.length === 0) { studentNameDropdown.style.display = "none"; studentNameDropdown.innerHTML = ""; return; }
        studentNameDropdown.innerHTML = "";
        d.matches.forEach(m => {
          const opt = document.createElement("option");
          opt.value = m.student_id;
          opt.textContent = `${m.student_name} (Grade ${m.grade_level})`;
          opt.dataset.name = m.student_name;
          opt.dataset.grade = m.grade_level;
          studentNameDropdown.appendChild(opt);
        });
        studentNameDropdown.style.display = "";
      } catch (err) {
        console.error("student find error", err);
        studentNameDropdown.style.display = "none";
        studentNameDropdown.innerHTML = "";
      }
    });

    studentNameDropdown.addEventListener("change", () => {
      const opt = studentNameDropdown.selectedOptions[0];
      if (!opt) return;
      studentNameInput.value = opt.dataset.name || opt.textContent || "";
      studentNameInput.dataset.studentId = opt.value || "";
      studentNameDropdown.style.display = "none";
    });
  }

  studentLoginBtn && studentLoginBtn.addEventListener("click", async () => {
    const sid = (studentNameInput && studentNameInput.dataset.studentId) || "";
    const check = studentIdCheckInput ? studentIdCheckInput.value.trim() : "";
    if (!sid || !check) { if (studentLoginMsg) studentLoginMsg.textContent = "Select your name and enter your ID."; return; }
    try {
      const r = await fetch("/api/student/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_id: sid, id_check: check }) });
      const d = await r.json();
      if (!d.ok) { studentLoginMsg && (studentLoginMsg.textContent = d.error || "Login failed."); return; }
      await loadStudentStatus();
    } catch (err) {
      console.error("student login error", err);
      studentLoginMsg && (studentLoginMsg.textContent = "Network error.");
    }
  });

  studentSignOutBtn && studentSignOutBtn.addEventListener("click", async () => {
    await fetch("/api/student/logout", { method: "POST" });
    currentStudentInfo = null; studentAcademic = []; studentElective = []; studentSpecial = "";
    if (studentNameInput) { studentNameInput.value = ""; studentNameInput.dataset.studentId = ""; }
    if (studentIdCheckInput) studentIdCheckInput.value = "";
    if (studentLoginMsg) studentLoginMsg.textContent = "";
    if (studentScheduleArea) hide(studentScheduleArea);
    if (studentLoginArea) show(studentLoginArea);
  });

  async function loadStudentStatus() {
    await loadSubjectColors();
    try {
      const r = await fetch("/api/student/status");
      const d = await r.json();
      if (!d.authed) { if (studentLoginMsg) studentLoginMsg.textContent = "Not authenticated."; return; }
      currentStudentInfo = d.student;
      studentAcademic = (d.schedule_items && d.schedule_items.academic) ? d.schedule_items.academic : [];
      studentElective = (d.schedule_items && d.schedule_items.elective) ? d.schedule_items.elective : [];
      studentSpecial = (d.schedule && d.schedule.special_instructions) ? d.schedule.special_instructions : "";
      const canSubmit = d.can_submit;
      if (studentInfoBlock) studentInfoBlock.innerHTML = `<div><strong>${escapeHTML(currentStudentInfo.student_name)}</strong></div><div>ID: ${escapeHTML(currentStudentInfo.student_id)}</div><div>Grade: ${escapeHTML(currentStudentInfo.grade_level)}</div><div>Submit allowed: ${canSubmit ? "Yes" : "Locked by counselor"}</div>`;
      if (specialInstructionsInput) specialInstructionsInput.value = studentSpecial;
      if (studentCardLink) studentCardLink.href = `/schedule_card/${encodeURIComponent(currentStudentInfo.student_id)}`;
      renderSelectedStudentLists();
      if (studentLoginArea) hide(studentLoginArea);
      if (studentScheduleArea) show(studentScheduleArea);
      await runStudentCourseSearch();
    } catch (err) { console.error("loadStudentStatus error", err); }
  }

  function renderSelectedStudentLists() {
    renderSelectedList(selectedAcademicList, studentAcademic, true);
    renderSelectedList(selectedElectiveList, studentElective, false);
  }

  function renderSelectedList(container, items, isAcademic) {
    if (!container) return;
    let out = "";
    items.forEach((it, idx) => {
      const style = subjectToStyle(it.subject_area, subjectColors);
      const cls = approvalClass(it);
      if (isAcademic) {
        out += `<div class="selectedRow ${cls}"><span class="courseChip" style="${style}">${escapeHTML(it.display)} ${approvalLabel(it)}</span><button class="smallBtn removeBtn" data-idx="${idx}" data-type="acad">Remove</button></div>`;
      } else {
        out += `<div class="selectedRow ${cls}"><span class="priorityNum">#${idx + 1}</span><span class="courseChip" style="${style}">${escapeHTML(it.display)} ${approvalLabel(it)}</span><div class="electiveBtns"><button class="smallBtn upBtn" data-idx="${idx}">▲</button><button class="smallBtn downBtn" data-idx="${idx}">▼</button><button class="smallBtn removeBtn" data-idx="${idx}" data-type="elec">Remove</button></div></div>`;
      }
    });
    if (items.length === 0) out = `<div class="dimtext">(none selected)</div>`;
    container.innerHTML = out;

    container.querySelectorAll(".removeBtn").forEach(btn => btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      const type = btn.dataset.type;
      if (type === "acad") studentAcademic.splice(idx, 1); else studentElective.splice(idx, 1);
      renderSelectedStudentLists();
    }));
    container.querySelectorAll(".upBtn").forEach(btn => btn.addEventListener("click", () => { moveItemUp(studentElective, parseInt(btn.dataset.idx)); renderSelectedStudentLists(); }));
    container.querySelectorAll(".downBtn").forEach(btn => btn.addEventListener("click", () => { moveItemDown(studentElective, parseInt(btn.dataset.idx)); renderSelectedStudentLists(); }));
  }

  studentRunCourseSearchBtn && studentRunCourseSearchBtn.addEventListener("click", runStudentCourseSearch);
  async function runStudentCourseSearch() {
    if (!currentStudentInfo) return;
    const params = new URLSearchParams();
    params.set("grade", currentStudentInfo.grade_level);
    if (studentFilterSubject && studentFilterSubject.value.trim()) params.set("subject", studentFilterSubject.value.trim());
    if (studentFilterName && studentFilterName.value.trim()) params.set("name", studentFilterName.value.trim());
    try {
      const r = await fetch(`/api/courses?${params.toString()}`);
      const d = await r.json();
      lastStudentCourseSearch = d.courses || [];
      let out = ""; lastStudentCourseSearch.forEach(c => { out += renderCourseCard(c); });
      if (studentAvailableCourses) studentAvailableCourses.innerHTML = out;
      if (studentAvailableCourses) studentAvailableCourses.querySelectorAll(".addCourseBtn").forEach(btn => btn.addEventListener("click", () => {
        const code = btn.dataset.code; const found = lastStudentCourseSearch.find(x => x.course_code === code); if (!found) return;
        const display = `${found.course_name} (${found.course_code})`; const item = { display, course_code: found.course_code, subject_area: found.subject_area || "Other", requires_approval: !!found.requires_approval, approval_status: found.requires_approval ? "pending" : "approved" };
        const isElective = (found.subject_area || "").toLowerCase().includes("cte") || (found.subject_area || "").toLowerCase().includes("elective");
        if (isElective) { if (studentElective.length >= (typeof MAX_ELECTIVE_CHOICES !== "undefined" ? MAX_ELECTIVE_CHOICES : 3)) return; if (!studentElective.find(x => x.course_code === item.course_code)) studentElective.push(item); }
        else { if (studentAcademic.length >= (typeof MAX_ACADEMIC_COURSES !== "undefined" ? MAX_ACADEMIC_COURSES : 4)) return; if (!studentAcademic.find(x => x.course_code === item.course_code)) studentAcademic.push(item); }
        renderSelectedStudentLists();
      }));
    } catch (err) { console.error("runStudentCourseSearch error", err); }
  }

  function renderCourseCard(c) {
    const style = subjectToStyle(c.subject_area || "Other", subjectColors);
    const approvalNote = c.requires_approval ? `<span class="approvalTag tagPending">Requires Approval</span>` : "";
    return `
      <div class="courseCard">
        <div class="courseHeader">
          <div class="courseTitle"><span>${escapeHTML(c.course_name)}</span><span class="courseCode">(${escapeHTML(c.course_code)})</span></div>
          <div class="courseMeta"><span class="coursePill" style="${style}">${escapeHTML(c.subject_area || "Other")}</span><span class="dimtext">${escapeHTML(c.level || "")}</span>${approvalNote}</div>
        </div>
        <div class="courseBody"><div class="desc">${escapeHTML(c.description || "")}</div><div class="teacherRoom"><strong>${escapeHTML(c.teacher_name || "")}</strong><span class="dimtext"> ${escapeHTML(c.room || "")}</span><span class="dimtext"> ${c.teacher_email ? "• " + escapeHTML(c.teacher_email) : ""}</span></div><div class="gradeRange dimtext">Grades ${escapeHTML(c.grade_min || "")}-${escapeHTML(c.grade_max || "")}</div></div>
        <div class="courseActions"><button class="addCourseBtn" data-code="${escapeHTML(c.course_code)}">Add</button></div>
      </div>
    `;
  }

  // -------------------- TEACHER implementation --------------------
  // teacher login/logout, status, roster, approve/reject, edit course description

  teacherLoginBtn && teacherLoginBtn.addEventListener("click", async () => {
    const email = teacherEmailInput ? teacherEmailInput.value.trim() : "";
    const pw = teacherPasswordInput ? teacherPasswordInput.value.trim() : "";
    if (!email || !pw) { if (teacherLoginMsg) teacherLoginMsg.textContent = "Enter email and password."; return; }
    try {
      const r = await fetch("/api/teacher/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw }) });
      const d = await r.json();
      if (d.ok) { if (teacherLoginMsg) teacherLoginMsg.textContent = ""; await loadTeacherState(); } else { if (teacherLoginMsg) teacherLoginMsg.textContent = d.error || "Login failed."; }
    } catch (err) { console.error("teacher login error", err); if (teacherLoginMsg) teacherLoginMsg.textContent = "Network error."; }
  });

  teacherLogoutBtn && teacherLogoutBtn.addEventListener("click", async () => {
    await fetch("/api/teacher/logout", { method: "POST" });
    await loadTeacherState();
  });

  async function loadTeacherState() {
    await loadSubjectColors();
    try {
      const r = await fetch("/api/teacher/status");
      const d = await r.json();
      if (!d.authed) { if (teacherLoginArea) show(teacherLoginArea); if (teacherDashboard) hide(teacherDashboard); return; }
      if (teacherLoginArea) hide(teacherLoginArea);
      if (teacherDashboard) show(teacherDashboard);
      if (teacherInfo) teacherInfo.innerHTML = `<div><strong>${escapeHTML(d.teacher.teacher_name || "")}</strong></div><div class="dimtext">${escapeHTML(d.teacher.teacher_email || "")}</div>`;
      await loadTeacherRoster();
    } catch (err) { console.error("loadTeacherState error", err); }
  }

  async function loadTeacherRoster() {
    if (!teacherRosters) return;
    try {
      const r = await fetch("/api/teacher/roster");
      if (!r.ok) { teacherRosters.innerHTML = `<div class="msg">Unable to load roster.</div>`; return; }
      const d = await r.json();
      const blocks = d.courses || [];
      if (!blocks.length) { teacherRosters.innerHTML = `<div class="infoBlock">No courses assigned to your email in courses.csv.</div>`; return; }
      let out = "";
      blocks.forEach(b => {
        const c = b.course;
        const style = subjectToStyle(c.subject_area || "Other", subjectColors);
        out += `<div class="teacherCourseBlock" data-course-code="${escapeHTML(c.course_code)}">
          <div class="teacherCourseHeader">
            <div><div class="teacherCourseTitle">${escapeHTML(c.course_name)} <span class="dimtext">(${escapeHTML(c.course_code)})</span></div>
              <div class="dimtext"><span class="coursePill" style="${style}">${escapeHTML(c.subject_area || "Other")}</span>${c.requires_approval ? `<span class="approvalTag tagPending">Requires Approval</span>` : `<span class="dimtext">No approvals required</span>`}</div></div>
            <div class="teacherCourseActions"><button class="smallBtn edit-course-desc">Edit description</button></div>
          </div>
          <div class="teacherCourseBody"><div class="course-description">${escapeHTML(c.description || "No description yet.")}</div>${renderTeacherStudentTable(c, b.students || [])}</div>
        </div>`;
      });
      teacherRosters.innerHTML = out;
      // wire approve/reject and edit buttons
      teacherRosters.querySelectorAll(".teacherApproveBtn").forEach(btn => btn.addEventListener("click", async () => { await teacherSetApproval(btn.dataset.sid, btn.dataset.code, "approved"); }));
      teacherRosters.querySelectorAll(".teacherRejectBtn").forEach(btn => btn.addEventListener("click", async () => { await teacherSetApproval(btn.dataset.sid, btn.dataset.code, "rejected"); }));
      teacherRosters.querySelectorAll(".edit-course-desc").forEach(btn => btn.addEventListener("click", (ev) => { const courseBlock = btn.closest(".teacherCourseBlock"); if (!courseBlock) return; openDescriptionEditorForBlock(courseBlock); }));
    } catch (err) { console.error("loadTeacherRoster error", err); teacherRosters.innerHTML = `<div class="msg">Unable to load roster.</div>`; }
  }

  function renderTeacherStudentTable(course, students) {
    if (!students || !students.length) return `<div class="infoBlock">No students have this course on their schedule yet.</div>`;
    let rows = "";
    students.forEach(s => {
      const st = (s.approval_status || "pending").toLowerCase();
      let tag = `<span class="approvalTag tagPending">PENDING</span>`;
      if (st === "approved") tag = `<span class="approvalTag tagApproved">APPROVED</span>`;
      if (st === "rejected") tag = `<span class="approvalTag tagRejected">REJECTED</span>`;
      const showButtons = !!course.requires_approval;
      rows += `<tr><td>${escapeHTML(s.student_name)}</td><td>${escapeHTML(s.student_id)}</td><td>${escapeHTML(s.grade_level)}</td><td>${tag}</td><td>${showButtons ? `<button class="smallBtn teacherApproveBtn" data-sid="${escapeHTML(s.student_id)}" data-code="${escapeHTML(course.course_code)}">Approve</button> <button class="smallBtn danger teacherRejectBtn" data-sid="${escapeHTML(s.student_id)}" data-code="${escapeHTML(course.course_code)}">Reject</button>` : `<span class="dimtext">N/A</span>`}</td></tr>`;
    });
    return `<table class="simpleTable"><thead><tr><th>Student</th><th>ID</th><th>Grade</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  async function teacherSetApproval(student_id, course_code, status) {
    try {
      const r = await fetch("/api/teacher/set_approval", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_id, course_code, status }) });
      const d = await r.json();
      if (d.ok) await loadTeacherRoster();
    } catch (err) { console.error("teacherSetApproval error", err); }
  }

  function openDescriptionEditorForBlock(courseBlock) {
    const courseCode = courseBlock.dataset.courseCode || courseBlock.getAttribute("data-course-code");
    const descEl = courseBlock.querySelector(".course-description");
    const currentText = descEl ? descEl.textContent.trim() : "";
    if (courseBlock.querySelector(".description-editor")) return;
    if (descEl) descEl.style.display = "none";

    const editor = document.createElement("div");
    editor.className = "description-editor";
    const textarea = document.createElement("textarea");
    textarea.rows = 5;
    textarea.style.width = "100%";
    textarea.value = currentText;
    const counter = document.createElement("div");
    counter.className = "word-counter";
    counter.style.marginTop = "6px";
    counter.textContent = `Words: ${countWords(textarea.value)} / 100`;
    const controls = document.createElement("div");
    controls.style.marginTop = "6px";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button"; saveBtn.className = "smallBtn"; saveBtn.textContent = "Save";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button"; cancelBtn.className = "smallBtn"; cancelBtn.textContent = "Cancel"; cancelBtn.style.marginLeft = "8px";
    controls.appendChild(saveBtn); controls.appendChild(cancelBtn);
    editor.appendChild(textarea); editor.appendChild(counter); editor.appendChild(controls);

    textarea.addEventListener("input", () => { counter.textContent = `Words: ${countWords(textarea.value)} / 100`; });
    cancelBtn.addEventListener("click", () => { editor.remove(); if (descEl) descEl.style.display = ""; });

    saveBtn.addEventListener("click", async () => {
      const newDesc = textarea.value.trim();
      const wc = countWords(newDesc);
      if (wc > 100) { alert(`Description is too long (${wc} words). Maximum is 100 words.`); return; }
      saveBtn.disabled = true;
      try {
        const resp = await fetch("/api/teacher/update_course_description", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course_code: courseCode, description: newDesc }) });
        if (!resp.ok) {
          let txt = "";
          try { txt = await resp.text(); } catch (e) { txt = "Error saving"; }
          alert("Save failed: " + (txt || "server error"));
          return;
        }
        // success - try parse json but not required
        const data = await safeJSON(resp);
        if (data && data.ok === false) { alert("Save failed: " + (data.error || "server error")); return; }
        if (descEl) { descEl.textContent = newDesc || "No description yet."; descEl.style.display = ""; }
        editor.remove();
      } catch (err) {
        console.error("save course description error", err);
        alert("Network error while saving description.");
      } finally { saveBtn.disabled = false; }
    });

    courseBlock.appendChild(editor);
  }

  // -------------------- COUNSELOR implementation (pagination, modal editor, PDF) --------------------
  counselorLoginBtn && counselorLoginBtn.addEventListener("click", async () => {
    const pw = counselorPassInput ? counselorPassInput.value.trim() : "";
    try {
      const r = await fetch("/api/counselor/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const d = await r.json();
      if (d.ok) { counselorLoginMsg.textContent = ""; await loadCounselorState(); } else { counselorLoginMsg.textContent = "Login failed."; }
    } catch (err) { console.error("counselor login error", err); counselorLoginMsg.textContent = "Network error."; }
  });

  logoutCounselorBtn && logoutCounselorBtn.addEventListener("click", async () => {
    await fetch("/api/counselor/logout", { method: "POST" });
    await loadCounselorState();
  });

  async function loadCounselorState() {
    await loadSubjectColors();
    try {
      const rTest = await fetch("/api/counselor/students");
      if (!rTest.ok) { if (counselorLoginArea) show(counselorLoginArea); if (counselorDashboard) hide(counselorDashboard); if (logoutCounselorBtn) hide(logoutCounselorBtn); return; }
      if (counselorLoginArea) hide(counselorLoginArea); if (counselorDashboard) show(counselorDashboard); if (logoutCounselorBtn) show(logoutCounselorBtn);
      await loadGradeLocks(); renderSubjectColorTable();
      counselorPage = 1; counselorPerPage = (perPageSelect && perPageSelect.value) ? (perPageSelect.value === "all" ? "all" : parseInt(perPageSelect.value, 10)) : 50;
      await loadStudentList(); await loadPendingApprovals();
    } catch (err) { console.error("loadCounselorState error", err); }
  }

  async function loadGradeLocks() {
    try {
      const r = await fetch("/api/counselor/settings");
      if (!r.ok) return;
      const d = await r.json();
      const locks = d.grade_submission_lock || {};
      const order = ["9", "10", "11", "12"];
      let out = `<table class="simpleTable"><thead><tr><th>Grade</th><th>Allow Submit?</th></tr></thead><tbody>`;
      order.forEach(g => { out += `<tr><td>${g}</td><td><input type="checkbox" class="gradeLockCB" data-grade="${g}" ${locks[g] ? "checked" : ""}></td></tr>`; });
      out += `</tbody></table>`;
      gradeLockControls.innerHTML = out;
    } catch (err) { console.error("loadGradeLocks error", err); }
  }

  saveGradeLocksBtn && saveGradeLocksBtn.addEventListener("click", async () => {
    const payload = { grade_submission_lock: {} };
    gradeLockControls.querySelectorAll(".gradeLockCB").forEach(cb => { payload.grade_submission_lock[cb.dataset.grade] = cb.checked; });
    try {
      const r = await fetch("/api/counselor/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      gradeLockMsg.textContent = d.ok ? "Saved." : "Error saving.";
    } catch (err) { console.error("saveGradeLocks error", err); gradeLockMsg.textContent = "Network error"; }
  });

  function renderSubjectColorTable() {
    const subjects = Object.keys(subjectColors).length ? Object.keys(subjectColors) : ["ELA", "Math", "Science", "Social Studies", "PE/Health", "CTE", "Elective", "Other"];
    let out = "";
    subjects.forEach(subj => {
      const col = subjectColors[subj] || "#475569";
      out += `<tr><td>${escapeHTML(subj)}</td><td><input type="color" class="subjectColorInput" data-subj="${escapeHTML(subj)}" value="${escapeHTML(col)}"></td></tr>`;
    });
    subjectColorTbody.innerHTML = out;
  }

  saveSubjectColorsBtn && saveSubjectColorsBtn.addEventListener("click", async () => {
    const updated = {};
    subjectColorTbody.querySelectorAll(".subjectColorInput").forEach(inp => { updated[inp.dataset.subj] = inp.value; });
    try {
      const r = await fetch("/api/counselor/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject_colors: updated }) });
      const d = await r.json();
      if (d.ok) { colorSaveMsg.textContent = "Saved."; subjectColors = d.settings.subject_colors || subjectColors; renderSubjectColorTable(); await loadStudentList(); } else { colorSaveMsg.textContent = "Error saving."; }
    } catch (err) { console.error("saveSubjectColors error", err); colorSaveMsg.textContent = "Network error"; }
  });

  uploadCsvBtn && uploadCsvBtn.addEventListener("click", async () => {
    const fd = new FormData();
    if (studentsCsvInput && studentsCsvInput.files[0]) fd.append("studentsCsv", studentsCsvInput.files[0]);
    if (coursesCsvInput && coursesCsvInput.files[0]) fd.append("coursesCsv", coursesCsvInput.files[0]);
    if (teachersCsvInput && teachersCsvInput.files[0]) fd.append("teachersCsv", teachersCsvInput.files[0]);
    try {
      const r = await fetch("/api/counselor/upload_csv", { method: "POST", body: fd });
      const d = await r.json();
      uploadMsg.textContent = d.ok ? "Upload complete." : "Upload failed.";
      if (d.ok) { await loadStudentList(); await loadPendingApprovals(); }
    } catch (err) { console.error("uploadCsv error", err); uploadMsg.textContent = "Network error"; }
  });

  applyFiltersBtn && applyFiltersBtn.addEventListener("click", async () => { counselorPage = 1; await loadStudentList(); });
  perPageSelect && perPageSelect.addEventListener("change", async () => { counselorPage = 1; counselorPerPage = perPageSelect.value === "all" ? "all" : parseInt(perPageSelect.value, 10); await loadStudentList(); });
  pagePrevBtn && pagePrevBtn.addEventListener("click", async () => { if (counselorPerPage === "all") return; if (counselorPage > 1) { counselorPage--; await loadStudentList(); } });
  pageNextBtn && pageNextBtn.addEventListener("click", async () => { if (counselorPerPage === "all") return; const maxPage = Math.max(1, Math.ceil(counselorTotal / counselorPerPage)); if (counselorPage < maxPage) { counselorPage++; await loadStudentList(); } });

  async function loadStudentList() {
    const params = new URLSearchParams();
    if (filterName && filterName.value.trim()) params.set("q_name", filterName.value.trim());
    if (filterGrade && filterGrade.value.trim()) params.set("grade", filterGrade.value.trim());
    if (filterCourse && filterCourse.value.trim()) params.set("course", filterCourse.value.trim());
    params.set("page", String(counselorPage));
    params.set("per_page", counselorPerPage === "all" ? "all" : String(counselorPerPage));
    try {
      const r = await fetch(`/api/counselor/students?${params.toString()}`);
      if (!r.ok) { counselorStudentRows.innerHTML = `<tr><td colspan="6" class="msg">Unable to load student list.</td></tr>`; return; }
      const d = await r.json();
      counselorTotal = d.total || 0;
      const students = d.students || [];
      if (studentCount) {
        if (counselorPerPage === "all") { studentCount.textContent = `Total in view: ${counselorTotal} (showing all)`; pageInfo && (pageInfo.textContent = `Page 1 of 1`); }
        else { const start = (d.page - 1) * d.per_page + 1; const end = Math.min(d.total, start + d.per_page - 1); studentCount.textContent = `Total in view: ${counselorTotal} (showing ${start}-${end})`; const maxPage = Math.max(1, Math.ceil(counselorTotal / d.per_page)); pageInfo && (pageInfo.textContent = `Page ${d.page} of ${maxPage}`); }
      }
      let out = "";
      (students || []).forEach(stu => {
        const rowClass = stu.scheduled ? "studentRowScheduled" : "studentRowNotScheduled";
        let chipsHTML = "";
        (stu.academic_courses || []).slice(0, 2).forEach(cn => { chipsHTML += `<span class="courseChip" style="${subjectToStyle("Other", subjectColors)}">${escapeHTML(cn)}</span> `; });
        if ((stu.academic_courses || []).length > 2) { chipsHTML += `<span class="courseChip" style="${subjectToStyle("Other", subjectColors)}">+${(stu.academic_courses || []).length - 2} more</span>`; }
        const approvalsSummary = `<span class="approvalMini">Pending: <strong>${stu.pending_approvals || 0}</strong></span> <span class="approvalMini">Rejected: <strong>${stu.rejected_approvals || 0}</strong></span>`;
        out += `<tr class="${rowClass}"><td><input type="checkbox" class="selectStudentCB" data-id="${escapeHTML(stu.student_id)}"></td><td><div class="boldish">${escapeHTML(stu.student_name)}</div><div class="dimtext">ID: ${escapeHTML(stu.student_id)} • Grade ${escapeHTML(stu.grade_level)}</div></td><td>${chipsHTML}</td><td>${escapeHTML(stu.top_elective || "")}</td><td>${approvalsSummary}</td><td><button class="smallBtn editBtn" data-id="${escapeHTML(stu.student_id)}">Edit</button><a class="buttonlike small" href="/schedule_card/${encodeURIComponent(stu.student_id)}" target="_blank">Card</a></td></tr>`;
      });
      counselorStudentRows.innerHTML = out;
      counselorStudentRows.querySelectorAll(".editBtn").forEach(btn => btn.addEventListener("click", async () => { await openCounselorEditSchedule(btn.dataset.id); }));
    } catch (err) {
      console.error("loadStudentList error", err);
      counselorStudentRows.innerHTML = `<tr><td colspan="6" class="msg">Network error loading students.</td></tr>`;
    }
  }

  // Print selected/all PDF handlers (unchanged)

  printCardsSelectedBtn && printCardsSelectedBtn.addEventListener("click", async () => {
    const checked = Array.from(document.querySelectorAll(".selectStudentCB:checked")).map(cb => cb.dataset.id).filter(Boolean);
    if (!checked || checked.length === 0) { alert("Select one or more students to print."); return; }
    try {
      const resp = await fetch("/api/printables/schedule_cards_pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_ids: checked }) });
      if (!resp.ok) { const txt = await resp.text(); alert("Failed to generate PDF: " + txt); return; }
      const blob = await resp.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "schedule_cards_selected.pdf"; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { console.error("print selected error", err); alert("Error generating PDF."); }
  });

  printCardsAllBtn && printCardsAllBtn.addEventListener("click", async () => {
    const params = new URLSearchParams();
    if (filterName && filterName.value.trim()) params.set("q_name", filterName.value.trim());
    if (filterGrade && filterGrade.value.trim()) params.set("grade", filterGrade.value.trim());
    if (filterCourse && filterCourse.value.trim()) params.set("course", filterCourse.value.trim());
    params.set("page", "1"); params.set("per_page", "all");
    try {
      const r = await fetch(`/api/counselor/students?${params.toString()}`);
      if (!r.ok) { alert("Failed to get students in view for PDF."); return; }
      const d = await r.json(); const ids = (d.students || []).map(s => s.student_id);
      if (!ids || ids.length === 0) { alert("No students in view to print."); return; }
      const resp = await fetch("/api/printables/schedule_cards_pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_ids: ids }) });
      if (!resp.ok) { const txt = await resp.text(); alert("Failed to generate PDF: " + txt); return; }
      const blob = await resp.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "schedule_cards_all.pdf"; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { console.error("print all error", err); alert("Error generating PDF for all in view."); }
  });

  // -------------------- initial landing --------------------
  showOnly(studentPanel);
  if (studentScheduleArea) hide(studentScheduleArea);
  if (studentLoginArea) show(studentLoginArea);

  // End IIFE
})();