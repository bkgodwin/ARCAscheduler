// static/main.js
//
// Complete client-side script for ARCAscheduler (student, teacher, counselor).
// Includes:
// - Student: select-based name suggestions, schedule editing and saving
// - Teacher: login, roster showing only assigned courses, approve/reject, inline edit course description (100-word limit)
// - Counselor: login, server-side pagination, per-page control, modal schedule editor (save/reset/delete), export schedule cards to single PDF
//
// Notes:
// - This file expects templates to include the DOM elements with the IDs referenced below.
// - For PDF export to work, the server must support /api/printables/schedule_cards_pdf (weasyprint recommended).
// - Back up existing static/main.js before replacing.

(function () {
  "use strict";

  // -------------------- Helpers --------------------
  function show(el) { if (!el) return; el.style.display = ""; }
  function hide(el) { if (!el) return; el.style.display = "none"; }
  function html(el, s) { if (!el) return; el.innerHTML = s; }
  function text(el, t) { if (!el) return; el.textContent = t; }

  function escapeHTML(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function extractCodeFromDisplay(s) {
    if (!s) return "";
    const m = s.match(/\(([^()]+)\)\s*$/);
    if (m) return m[1].trim();
    return s.trim();
  }

  function subjectToStyle(subjRaw, subjectColorsMap) {
    let subj = subjRaw && subjRaw.trim() ? subjRaw.trim() : "Other";
    if (subjectColorsMap && subjectColorsMap[subj]) {
      return `background:${subjectColorsMap[subj]};`;
    }
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

  function moveItemUp(arr, idx) {
    if (idx <= 0) return;
    const tmp = arr[idx - 1];
    arr[idx - 1] = arr[idx];
    arr[idx] = tmp;
  }
  function moveItemDown(arr, idx) {
    if (idx >= arr.length - 1) return;
    const tmp = arr[idx + 1];
    arr[idx + 1] = arr[idx];
    arr[idx] = tmp;
  }

  function countWords(s) {
    if (!s) return 0;
    return s.trim().split(/\s+/).filter(Boolean).length;
  }

  // -------------------- DOM references --------------------
  const studentModeBtn = document.getElementById("studentModeBtn");
  const teacherModeBtn = document.getElementById("teacherModeBtn");
  const counselorModeBtn = document.getElementById("counselorModeBtn");

  const studentPanel = document.getElementById("studentPanel");
  const teacherPanel = document.getElementById("teacherPanel");
  const counselorPanel = document.getElementById("counselorPanel");

  // Student
  const studentLoginArea = document.getElementById("studentLoginArea");
  const studentNameInput = document.getElementById("studentNameInput");
  const studentNameDropdown = document.getElementById("studentNameDropdown"); // <select>
  const studentIdCheckInput = document.getElementById("studentIdCheckInput");
  const studentLoginBtn = document.getElementById("studentLoginBtn");
  const studentLoginMsg = document.getElementById("studentLoginMsg");

  const studentScheduleArea = document.getElementById("studentScheduleArea");
  const studentInfoBlock = document.getElementById("studentInfoBlock");
  const selectedAcademicList = document.getElementById("selectedAcademicList");
  const selectedElectiveList = document.getElementById("selectedElectiveList");
  const specialInstructionsInput = document.getElementById("specialInstructionsInput");
  const studentSaveBtn = document.getElementById("studentSaveBtn");
  const studentSaveMsg = document.getElementById("studentSaveMsg");
  const studentCardLink = document.getElementById("studentCardLink");
  const studentSignOutBtn = document.getElementById("studentSignOutBtn");

  const studentFilterSubject = document.getElementById("studentFilterSubject");
  const studentFilterName = document.getElementById("studentFilterName");
  const studentRunCourseSearchBtn = document.getElementById("studentRunCourseSearchBtn");
  const studentAvailableCourses = document.getElementById("studentAvailableCourses");

  const maxAcademicSpan = document.getElementById("maxAcademicSpan");
  const maxElectiveSpan = document.getElementById("maxElectiveSpan");

  // Teacher
  const teacherLoginArea = document.getElementById("teacherLoginArea");
  const teacherDashboard = document.getElementById("teacherDashboard");
  const teacherEmailInput = document.getElementById("teacherEmailInput");
  const teacherPasswordInput = document.getElementById("teacherPasswordInput");
  const teacherLoginBtn = document.getElementById("teacherLoginBtn");
  const teacherLoginMsg = document.getElementById("teacherLoginMsg");
  const teacherLogoutBtn = document.getElementById("teacherLogoutBtn");
  const teacherInfo = document.getElementById("teacherInfo");
  const teacherRosters = document.getElementById("teacherRosters");

  // Counselor
  const counselorLoginArea = document.getElementById("counselorLoginArea");
  const counselorDashboard = document.getElementById("counselorDashboard");
  const counselorPassInput = document.getElementById("counselorPassInput");
  const counselorLoginBtn = document.getElementById("counselorLoginBtn");
  const counselorLoginMsg = document.getElementById("counselorLoginMsg");
  const logoutCounselorBtn = document.getElementById("logoutCounselorBtn");

  const gradeLockControls = document.getElementById("gradeLockControls");
  const saveGradeLocksBtn = document.getElementById("saveGradeLocksBtn");
  const gradeLockMsg = document.getElementById("gradeLockMsg");

  const subjectColorTbody = document.getElementById("subjectColorTbody");
  const saveSubjectColorsBtn = document.getElementById("saveSubjectColorsBtn");
  const colorSaveMsg = document.getElementById("colorSaveMsg");

  const studentsCsvInput = document.getElementById("studentsCsvInput");
  const coursesCsvInput = document.getElementById("coursesCsvInput");
  const teachersCsvInput = document.getElementById("teachersCsvInput");
  const uploadCsvBtn = document.getElementById("uploadCsvBtn");
  const uploadMsg = document.getElementById("uploadMsg");

  const filterName = document.getElementById("filterName");
  const filterGrade = document.getElementById("filterGrade");
  const filterCourse = document.getElementById("filterCourse");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const exportFilteredBtn = document.getElementById("exportFilteredBtn");
  const exportAllSchedulesBtn = document.getElementById("exportAllSchedulesBtn");
  const studentCount = document.getElementById("studentCount");
  const counselorStudentRows = document.getElementById("counselorStudentRows");
  const printCardsSelectedBtn = document.getElementById("printCardsSelectedBtn");
  const printCardsAllBtn = document.getElementById("printCardsAllBtn");
  const rosterCourseCode = document.getElementById("rosterCourseCode");
  const rosterPrintBtn = document.getElementById("rosterPrintBtn");

  const pendingApprovalCount = document.getElementById("pendingApprovalCount");
  const pendingApprovalsList = document.getElementById("pendingApprovalsList");

  // Modal elements (must exist in template)
  const editScheduleModal = document.getElementById("editScheduleModal");
  const editModalCloseBtn = document.getElementById("editModalCloseBtn");
  const editScheduleInfo = document.getElementById("editScheduleInfo");
  const cSelectedAcademicList = document.getElementById("cSelectedAcademicList");
  const cSelectedElectiveList = document.getElementById("cSelectedElectiveList");
  const counselorNotesInput = document.getElementById("counselorNotesInput");
  const saveCounselorScheduleBtn = document.getElementById("saveCounselorScheduleBtn");
  const resetScheduleBtn = document.getElementById("resetScheduleBtn");
  const deleteStudentBtn = document.getElementById("deleteStudentBtn");
  const editScheduleMsg = document.getElementById("editScheduleMsg");
  const cFilterSubject = document.getElementById("cFilterSubject");
  const cFilterNameSearch = document.getElementById("cFilterNameSearch");
  const cRunCourseSearchBtn = document.getElementById("cRunCourseSearchBtn");
  const cAvailableCoursesGrid = document.getElementById("cAvailableCoursesGrid");
  const cMaxAcademicSpan = document.getElementById("cMaxAcademicSpan");
  const cMaxElectiveSpan = document.getElementById("cMaxElectiveSpan");

  const perPageSelect = document.getElementById("perPageSelect");
  const pagePrevBtn = document.getElementById("pagePrevBtn");
  const pageNextBtn = document.getElementById("pageNextBtn");
  const pageInfo = document.getElementById("pageInfo");

  // -------------------- Constants & State --------------------
  if (maxAcademicSpan) maxAcademicSpan.textContent = MAX_ACADEMIC_COURSES;
  if (maxElectiveSpan) maxElectiveSpan.textContent = MAX_ELECTIVE_CHOICES;
  if (cMaxAcademicSpan) cMaxAcademicSpan.textContent = MAX_ACADEMIC_COURSES;
  if (cMaxElectiveSpan) cMaxElectiveSpan.textContent = MAX_ELECTIVE_CHOICES;

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
    hide(studentPanel);
    hide(teacherPanel);
    hide(counselorPanel);
    show(panel);
  }

  studentModeBtn && studentModeBtn.addEventListener("click", async () => { showOnly(studentPanel); });
  teacherModeBtn && teacherModeBtn.addEventListener("click", async () => { showOnly(teacherPanel); await loadTeacherState(); });
  counselorModeBtn && counselorModeBtn.addEventListener("click", async () => { showOnly(counselorPanel); await loadCounselorState(); });

  // -------------------- Utilities --------------------
  async function loadSubjectColors() {
    try {
      const r = await fetch("/api/counselor/settings");
      if (!r.ok) return;
      const d = await r.json();
      subjectColors = d.subject_colors || {};
    } catch (e) {
      console.error("Failed to load subject colors", e);
    }
  }

  // -------------------- Student --------------------
  if (studentNameInput) {
    studentNameInput.addEventListener("input", async () => {
      const q = studentNameInput.value.trim();
      if (q.length < 2) {
        if (studentNameDropdown) { studentNameDropdown.style.display = "none"; studentNameDropdown.innerHTML = ""; }
        return;
      }
      try {
        const r = await fetch(`/api/student/find?q=${encodeURIComponent(q)}`);
        if (!r.ok) {
          if (studentNameDropdown) { studentNameDropdown.style.display = "none"; studentNameDropdown.innerHTML = ""; }
          return;
        }
        const d = await r.json();
        if (!d.matches || d.matches.length === 0) { if (studentNameDropdown) { studentNameDropdown.style.display = "none"; studentNameDropdown.innerHTML = ""; } return; }
        if (studentNameDropdown) {
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
        }
      } catch (err) {
        console.error("Error fetching student suggestions:", err);
        if (studentNameDropdown) { studentNameDropdown.style.display = "none"; studentNameDropdown.innerHTML = ""; }
      }
    });

    studentNameDropdown && studentNameDropdown.addEventListener("change", () => {
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
    if (!sid || !check) {
      if (studentLoginMsg) studentLoginMsg.textContent = "Select your name and enter your ID.";
      return;
    }
    try {
      const r = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: sid, id_check: check })
      });
      const d = await r.json();
      if (!d.ok) {
        if (studentLoginMsg) studentLoginMsg.textContent = d.error || "Login failed.";
        return;
      }
      await loadStudentStatus();
    } catch (e) {
      console.error("Student login error", e);
      if (studentLoginMsg) studentLoginMsg.textContent = "Network error.";
    }
  });

  studentSignOutBtn && studentSignOutBtn.addEventListener("click", async () => {
    await fetch("/api/student/logout", { method: "POST" });
    currentStudentInfo = null; studentAcademic = []; studentElective = []; studentSpecial = "";
    if (studentNameInput) { studentNameInput.value = ""; studentNameInput.dataset.studentId = ""; }
    if (studentIdCheckInput) studentIdCheckInput.value = "";
    if (studentLoginMsg) studentLoginMsg.textContent = "";
    hide(studentScheduleArea); show(studentLoginArea);
  });

  async function loadStudentStatus() {
    await loadSubjectColors();
    try {
      const r = await fetch("/api/student/status");
      const d = await r.json();
      if (!d.authed) {
        if (studentLoginMsg) studentLoginMsg.textContent = "Not authenticated.";
        return;
      }
      currentStudentInfo = d.student;
      studentAcademic = (d.schedule_items && d.schedule_items.academic) ? d.schedule_items.academic : [];
      studentElective = (d.schedule_items && d.schedule_items.elective) ? d.schedule_items.elective : [];
      studentSpecial = (d.schedule && d.schedule.special_instructions) ? d.schedule.special_instructions : "";

      const canSubmit = d.can_submit;
      if (studentInfoBlock) studentInfoBlock.innerHTML = `
        <div><strong>${escapeHTML(currentStudentInfo.student_name)}</strong></div>
        <div>ID: ${escapeHTML(currentStudentInfo.student_id)}</div>
        <div>Grade: ${escapeHTML(currentStudentInfo.grade_level)}</div>
        <div>Submit allowed: ${canSubmit ? "Yes" : "Locked by counselor"}</div>
      `;
      if (specialInstructionsInput) specialInstructionsInput.value = studentSpecial;
      if (studentCardLink) studentCardLink.href = `/schedule_card/${encodeURIComponent(currentStudentInfo.student_id)}`;

      renderSelectedStudentLists();
      hide(studentLoginArea); show(studentScheduleArea);
      await runStudentCourseSearch();
    } catch (err) {
      console.error("Error loading student status:", err);
    }
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
        out += `
          <div class="selectedRow ${cls}">
            <span class="courseChip" style="${style}">
              ${escapeHTML(it.display)} ${approvalLabel(it)}
            </span>
            <button class="smallBtn removeBtn" data-idx="${idx}" data-type="acad">Remove</button>
          </div>
        `;
      } else {
        out += `
          <div class="selectedRow ${cls}">
            <span class="priorityNum">#${idx + 1}</span>
            <span class="courseChip" style="${style}">
              ${escapeHTML(it.display)} ${approvalLabel(it)}
            </span>
            <div class="electiveBtns">
              <button class="smallBtn upBtn" data-idx="${idx}">▲</button>
              <button class="smallBtn downBtn" data-idx="${idx}">▼</button>
              <button class="smallBtn removeBtn" data-idx="${idx}" data-type="elec">Remove</button>
            </div>
          </div>
        `;
      }
    });
    if (items.length === 0) out = `<div class="dimtext">(none selected)</div>`;
    container.innerHTML = out;

    container.querySelectorAll(".removeBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        const type = btn.dataset.type;
        if (type === "acad") studentAcademic.splice(idx, 1);
        else studentElective.splice(idx, 1);
        renderSelectedStudentLists();
      });
    });
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
      let out = "";
      lastStudentCourseSearch.forEach(c => { out += renderCourseCard(c); });
      if (studentAvailableCourses) studentAvailableCourses.innerHTML = out;
      if (studentAvailableCourses) {
        studentAvailableCourses.querySelectorAll(".addCourseBtn").forEach(btn => btn.addEventListener("click", () => {
          const code = btn.dataset.code;
          const found = lastStudentCourseSearch.find(x => x.course_code === code);
          if (!found) return;
          const display = `${found.course_name} (${found.course_code})`;
          const item = { display, course_code: found.course_code, subject_area: found.subject_area || "Other", requires_approval: !!found.requires_approval, approval_status: found.requires_approval ? "pending" : "approved" };
          const isElective = (found.subject_area || "").toLowerCase().includes("cte") || (found.subject_area || "").toLowerCase().includes("elective");
          if (isElective) { if (studentElective.length >= MAX_ELECTIVE_CHOICES) return; if (!studentElective.find(x => x.course_code === item.course_code)) studentElective.push(item); }
          else { if (studentAcademic.length >= MAX_ACADEMIC_COURSES) return; if (!studentAcademic.find(x => x.course_code === item.course_code)) studentAcademic.push(item); }
          renderSelectedStudentLists();
        }));
      }
    } catch (err) { console.error("Error fetching courses:", err); }
  }

  function renderCourseCard(c) {
    const style = subjectToStyle(c.subject_area || "Other", subjectColors);
    const approvalNote = c.requires_approval ? `<span class="approvalTag tagPending">Requires Approval</span>` : "";
    return `
      <div class="courseCard">
        <div class="courseHeader">
          <div class="courseTitle">
            <span>${escapeHTML(c.course_name)}</span>
            <span class="courseCode">(${escapeHTML(c.course_code)})</span>
          </div>
          <div class="courseMeta">
            <span class="coursePill" style="${style}">${escapeHTML(c.subject_area || "Other")}</span>
            <span class="dimtext">${escapeHTML(c.level || "")}</span>
            ${approvalNote}
          </div>
        </div>
        <div class="courseBody">
          <div class="desc">${escapeHTML(c.description || "")}</div>
          <div class="teacherRoom">
            <strong>${escapeHTML(c.teacher_name || "")}</strong>
            <span class="dimtext"> ${escapeHTML(c.room || "")}</span>
            <span class="dimtext"> ${c.teacher_email ? "• " + escapeHTML(c.teacher_email) : ""}</span>
          </div>
          <div class="gradeRange dimtext">Grades ${escapeHTML(c.grade_min || "")}-${escapeHTML(c.grade_max || "")}</div>
        </div>
        <div class="courseActions">
          <button class="addCourseBtn" data-code="${escapeHTML(c.course_code)}">Add</button>
        </div>
      </div>
    `;
  }

  studentSaveBtn && studentSaveBtn.addEventListener("click", async () => {
    if (!currentStudentInfo) return;
    const payload = { academic_courses: studentAcademic.map(x => x.display), elective_courses: studentElective.map(x => x.display), special_instructions: specialInstructionsInput.value.trim() };
    try {
      const r = await fetch("/api/student/save_schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.ok) { studentSaveMsg.textContent = "Saved! Approval-required courses will show PENDING until a teacher approves."; await loadStudentStatus(); }
      else { studentSaveMsg.textContent = d.error || "Error saving schedule."; }
    } catch (err) { console.error("Error saving schedule:", err); studentSaveMsg.textContent = "Network error while saving."; }
  });

  // -------------------- Teacher (already included above) --------------------
  // loadTeacherState, loadTeacherRoster, teacherSetApproval, openDescriptionEditorForBlock
  // (Use the implementations earlier in this file — see above functions.)

  // For brevity: re-use the functions defined earlier in this same file (they are present above).
  // No additional code required here.

  // -------------------- Counselor --------------------
  counselorLoginBtn && counselorLoginBtn.addEventListener("click", async () => {
    const pw = counselorPassInput.value.trim();
    try {
      const r = await fetch("/api/counselor/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const d = await r.json();
      if (d.ok) { counselorLoginMsg.textContent = ""; await loadCounselorState(); } else { counselorLoginMsg.textContent = "Login failed."; }
    } catch (err) { console.error("Counselor login error", err); counselorLoginMsg.textContent = "Network error."; }
  });

  logoutCounselorBtn && logoutCounselorBtn.addEventListener("click", async () => {
    await fetch("/api/counselor/logout", { method: "POST" });
    await loadCounselorState();
  });

  async function loadCounselorState() {
    await loadSubjectColors();
    const rTest = await fetch("/api/counselor/students");
    if (!rTest.ok) { show(counselorLoginArea); hide(counselorDashboard); hide(logoutCounselorBtn); return; }
    hide(counselorLoginArea); show(counselorDashboard); show(logoutCounselorBtn);
    await loadGradeLocks(); renderSubjectColorTable();
    counselorPage = 1;
    counselorPerPage = (perPageSelect && perPageSelect.value) ? (perPageSelect.value === "all" ? "all" : parseInt(perPageSelect.value, 10)) : 50;
    await loadStudentList(); await loadPendingApprovals();
  }

  async function loadGradeLocks() {
    const r = await fetch("/api/counselor/settings");
    if (!r.ok) return;
    const d = await r.json();
    const locks = d.grade_submission_lock || {};
    const order = ["9", "10", "11", "12"];
    let out = `<table class="simpleTable"><thead><tr><th>Grade</th><th>Allow Submit?</th></tr></thead><tbody>`;
    order.forEach(g => { out += `<tr><td>${g}</td><td><input type="checkbox" class="gradeLockCB" data-grade="${g}" ${locks[g] ? "checked" : ""}></td></tr>`; });
    out += `</tbody></table>`;
    gradeLockControls.innerHTML = out;
  }

  saveGradeLocksBtn && saveGradeLocksBtn.addEventListener("click", async () => {
    const payload = { grade_submission_lock: {} };
    gradeLockControls.querySelectorAll(".gradeLockCB").forEach(cb => { payload.grade_submission_lock[cb.dataset.grade] = cb.checked; });
    const r = await fetch("/api/counselor/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    gradeLockMsg.textContent = d.ok ? "Saved." : "Error saving.";
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
    const r = await fetch("/api/counselor/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject_colors: updated }) });
    const d = await r.json();
    if (d.ok) { colorSaveMsg.textContent = "Saved."; subjectColors = d.settings.subject_colors || subjectColors; renderSubjectColorTable(); await loadStudentList(); } else { colorSaveMsg.textContent = "Error saving."; }
  });

  uploadCsvBtn && uploadCsvBtn.addEventListener("click", async () => {
    const fd = new FormData();
    if (studentsCsvInput.files[0]) fd.append("studentsCsv", studentsCsvInput.files[0]);
    if (coursesCsvInput.files[0]) fd.append("coursesCsv", coursesCsvInput.files[0]);
    if (teachersCsvInput.files[0]) fd.append("teachersCsv", teachersCsvInput.files[0]);
    const r = await fetch("/api/counselor/upload_csv", { method: "POST", body: fd });
    const d = await r.json();
    if (d.ok) { uploadMsg.textContent = "Upload complete."; await loadStudentList(); await loadPendingApprovals(); } else { uploadMsg.textContent = "Upload failed."; }
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
      console.error("Error loading student list:", err);
      counselorStudentRows.innerHTML = `<tr><td colspan="6" class="msg">Network error loading students.</td></tr>`;
    }
  }

  // Print selected as PDF
  printCardsSelectedBtn && printCardsSelectedBtn.addEventListener("click", async () => {
    const checked = Array.from(document.querySelectorAll(".selectStudentCB:checked")).map(cb => cb.dataset.id).filter(Boolean);
    if (!checked || checked.length === 0) { alert("Select one or more students to print."); return; }
    try {
      const resp = await fetch("/api/printables/schedule_cards_pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_ids: checked }) });
      if (!resp.ok) { const txt = await resp.text(); alert("Failed to generate PDF: " + txt); return; }
      const blob = await resp.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "schedule_cards_selected.pdf"; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); alert("Error generating PDF."); }
  });

  // Print all in view as PDF
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
    } catch (err) { console.error(err); alert("Error generating PDF for all in view."); }
  });

  exportFilteredBtn && exportFilteredBtn.addEventListener("click", () => {
    const params = new URLSearchParams();
    if (filterName && filterName.value.trim()) params.set("q_name", filterName.value.trim());
    if (filterGrade && filterGrade.value.trim()) params.set("grade", filterGrade.value.trim());
    if (filterCourse && filterCourse.value.trim()) params.set("course", filterCourse.value.trim());
    window.open(`/api/counselor/export_filtered?${params.toString()}`, "_blank");
  });
  exportAllSchedulesBtn && exportAllSchedulesBtn.addEventListener("click", () => { window.open("/api/counselor/export_all_schedules", "_blank"); });
  rosterPrintBtn && rosterPrintBtn.addEventListener("click", () => { const code = rosterCourseCode.value.trim(); if (!code) return; window.open(`/roster/${encodeURIComponent(code)}`, "_blank"); });

  async function loadPendingApprovals() {
    const r = await fetch("/api/counselor/pending_approvals");
    if (!r.ok) { pendingApprovalCount.textContent = ""; pendingApprovalsList.innerHTML = `<div class="msg">Unable to load pending approvals.</div>`; return; }
    const d = await r.json(); pendingApprovalCount.textContent = `Pending approvals: ${d.total}`;
    if ((d.pending || []).length === 0) { pendingApprovalsList.innerHTML = `<div class="infoBlock">No pending approvals.</div>`; return; }
    let rows = "";
    d.pending.forEach(p => { rows += `<tr><td>${escapeHTML(p.course_name)} <span class="dimtext">(${escapeHTML(p.course_code)})</span></td><td>${escapeHTML(p.student_name)} <span class="dimtext">(${escapeHTML(p.student_id)})</span></td><td>${escapeHTML(p.grade_level)}</td><td>${escapeHTML(p.teacher_email || "")}</td><td class="dimtext">${escapeHTML(p.updated_at || "")}</td></tr>`; });
    pendingApprovalsList.innerHTML = `<table class="simpleTable"><thead><tr><th>Course</th><th>Student</th><th>Grade</th><th>Teacher</th><th>Last Updated</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // -------------------- Modal functions (open/close with scroll handling, ESC, overlay) --------------------
  let __modalKeyHandler = null;
  let __modalOverlayHandler = null;
  let __prevBodyOverflow = null;

  function openEditModal() {
    if (!editScheduleModal) return;
    __prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (editScheduleMsg) editScheduleMsg.textContent = "";
    editScheduleModal.setAttribute("aria-hidden", "false");
    show(editScheduleModal);
    const focusable = editScheduleModal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
    __modalKeyHandler = function (e) { if (e.key === "Escape") closeEditModal(); };
    document.addEventListener("keydown", __modalKeyHandler);
    __modalOverlayHandler = function (e) { if (e.target === editScheduleModal) closeEditModal(); };
    editScheduleModal.addEventListener("click", __modalOverlayHandler);
  }

  function closeEditModal() {
    if (!editScheduleModal) return;
    editScheduleModal.setAttribute("aria-hidden", "true");
    hide(editScheduleModal);
    if (__prevBodyOverflow !== null) { document.body.style.overflow = __prevBodyOverflow; __prevBodyOverflow = null; } else { document.body.style.overflow = ""; }
    if (__modalKeyHandler) { document.removeEventListener("keydown", __modalKeyHandler); __modalKeyHandler = null; }
    if (__modalOverlayHandler) { editScheduleModal.removeEventListener("click", __modalOverlayHandler); __modalOverlayHandler = null; }
    counselorEditStudentID = null; counselorEditStudentName = null; counselorEditStudentGrade = null; counselorAcademicItems = []; counselorElectiveItems = [];
    if (cSelectedAcademicList) cSelectedAcademicList.innerHTML = "";
    if (cSelectedElectiveList) cSelectedElectiveList.innerHTML = "";
    if (cAvailableCoursesGrid) cAvailableCoursesGrid.innerHTML = "";
    if (counselorNotesInput) counselorNotesInput.value = "";
    if (editScheduleInfo) editScheduleInfo.innerHTML = "";
    if (editScheduleMsg) editScheduleMsg.textContent = "";
  }

  editModalCloseBtn && editModalCloseBtn.addEventListener("click", () => closeEditModal());

  // -------------------- Open modal + populate --------------------
  async function openCounselorEditSchedule(student_id) {
    try {
      const r = await fetch(`/api/counselor/get_schedule?student_id=${encodeURIComponent(student_id)}`);
      if (!r.ok) { alert("Unable to fetch schedule for editing."); return; }
      const d = await r.json();
      if (!d.schedule) { alert("Schedule not found."); return; }
      counselorEditStudentID = d.schedule.student_id;
      counselorEditStudentName = d.schedule.student_name;
      counselorEditStudentGrade = d.schedule.grade_level;
      counselorAcademicItems = (d.schedule_items && d.schedule_items.academic) ? d.schedule_items.academic.slice() : [];
      counselorElectiveItems = (d.schedule_items && d.schedule_items.elective) ? d.schedule_items.elective.slice() : [];
      if (counselorNotesInput) counselorNotesInput.value = (d.schedule.special_instructions || "");
      if (editScheduleInfo) editScheduleInfo.innerHTML = `<div><strong>${escapeHTML(counselorEditStudentName)}</strong> (ID: ${escapeHTML(counselorEditStudentID)}) Grade ${escapeHTML(counselorEditStudentGrade)}</div>`;
      renderCounselorSelectedLists();
      openEditModal();
      await runCounselorCourseSearch();
    } catch (err) {
      console.error("Error opening edit schedule:", err);
      alert("Network error while opening edit modal.");
    }
  }

  function renderCounselorSelectedLists() {
    renderCounselorList(cSelectedAcademicList, counselorAcademicItems, true);
    renderCounselorList(cSelectedElectiveList, counselorElectiveItems, false);
  }

  function renderCounselorList(container, items, isAcademic) {
    if (!container) return;
    let out = "";
    items.forEach((it, idx) => {
      const style = subjectToStyle(it.subject_area, subjectColors);
      const cls = approvalClass(it);
      if (isAcademic) {
        out += `<div class="selectedRow ${cls}"><span class="courseChip" style="${style}">${escapeHTML(it.display)} ${approvalLabel(it)}</span>
          <button class="smallBtn removeCounselorBtn" data-idx="${idx}" data-type="acad">Remove</button></div>`;
      } else {
        out += `<div class="selectedRow ${cls}"><span class="priorityNum">#${idx + 1}</span><span class="courseChip" style="${style}">${escapeHTML(it.display)} ${approvalLabel(it)}</span>
          <div class="electiveBtns"><button class="smallBtn upCounselorBtn" data-idx="${idx}">▲</button><button class="smallBtn downCounselorBtn" data-idx="${idx}">▼</button>
          <button class="smallBtn removeCounselorBtn" data-idx="${idx}" data-type="elec">Remove</button></div></div>`;
      }
    });
    if (items.length === 0) out = `<div class="dimtext">(none selected)</div>`;
    container.innerHTML = out;

    container.querySelectorAll(".removeCounselorBtn").forEach(btn => btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx); const type = btn.dataset.type;
      if (type === "acad") counselorAcademicItems.splice(idx, 1); else counselorElectiveItems.splice(idx, 1);
      renderCounselorSelectedLists();
    }));
    container.querySelectorAll(".upCounselorBtn").forEach(btn => btn.addEventListener("click", () => { moveItemUp(counselorElectiveItems, parseInt(btn.dataset.idx)); renderCounselorSelectedLists(); }));
    container.querySelectorAll(".downCounselorBtn").forEach(btn => btn.addEventListener("click", () => { moveItemDown(counselorElectiveItems, parseInt(btn.dataset.idx)); renderCounselorSelectedLists(); }));
  }

  cRunCourseSearchBtn && cRunCourseSearchBtn.addEventListener("click", runCounselorCourseSearch);
  async function runCounselorCourseSearch() {
    if (!counselorEditStudentGrade) return;
    const params = new URLSearchParams(); params.set("grade", counselorEditStudentGrade);
    if (cFilterSubject && cFilterSubject.value.trim()) params.set("subject", cFilterSubject.value.trim());
    if (cFilterNameSearch && cFilterNameSearch.value.trim()) params.set("name", cFilterNameSearch.value.trim());
    try {
      const r = await fetch(`/api/courses?${params.toString()}`);
      const d = await r.json(); lastCounselorCourseSearch = d.courses || [];
      let out = ""; lastCounselorCourseSearch.forEach(c => { out += renderCourseCard(c); });
      if (cAvailableCoursesGrid) cAvailableCoursesGrid.innerHTML = out;
      if (cAvailableCoursesGrid) {
        cAvailableCoursesGrid.querySelectorAll(".addCourseBtn").forEach(btn => btn.addEventListener("click", () => {
          const code = btn.dataset.code; const found = lastCounselorCourseSearch.find(x => x.course_code === code); if (!found) return;
          const display = `${found.course_name} (${found.course_code})`; const item = { display, course_code: found.course_code, subject_area: found.subject_area || "Other", requires_approval: !!found.requires_approval, approval_status: found.requires_approval ? "pending" : "approved" };
          const isElective = (found.subject_area || "").toLowerCase().includes("cte") || (found.subject_area || "").toLowerCase().includes("elective");
          if (isElective) { if (counselorElectiveItems.length >= MAX_ELECTIVE_CHOICES) return; if (!counselorElectiveItems.find(x => x.course_code === item.course_code)) counselorElectiveItems.push(item); }
          else { if (counselorAcademicItems.length >= MAX_ACADEMIC_COURSES) return; if (!counselorAcademicItems.find(x => x.course_code === item.course_code)) counselorAcademicItems.push(item); }
          renderCounselorSelectedLists();
        }));
      }
    } catch (err) { console.error("Error loading counselor course search:", err); }
  }

  // Save edited schedule
  saveCounselorScheduleBtn && saveCounselorScheduleBtn.addEventListener("click", async () => {
    if (!counselorEditStudentID) { editScheduleMsg.textContent = "No student selected."; return; }
    const payload = { student_id: counselorEditStudentID, student_name: counselorEditStudentName, grade_level: counselorEditStudentGrade, academic_courses: counselorAcademicItems.map(x => x.display), elective_courses: counselorElectiveItems.map(x => x.display), special_instructions: (counselorNotesInput ? counselorNotesInput.value.trim() : "") };
    try {
      const r = await fetch("/api/counselor/save_schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.ok) { editScheduleMsg.textContent = "Saved."; await loadStudentList(); await loadPendingApprovals(); closeEditModal(); } else { editScheduleMsg.textContent = d.error || "Error saving."; }
    } catch (err) { console.error("Error saving counselor schedule:", err); editScheduleMsg.textContent = "Network error while saving."; }
  });

  // Reset schedule
  resetScheduleBtn && resetScheduleBtn.addEventListener("click", async () => {
    if (!counselorEditStudentID) { editScheduleMsg.textContent = "No student selected."; return; }
    if (!confirm("Reset schedule for this student? This will clear all selected courses and approvals.")) return;
    try {
      const r = await fetch("/api/counselor/reset_schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_id: counselorEditStudentID }) });
      const d = await r.json();
      if (d.ok) { editScheduleMsg.textContent = "Schedule reset."; await loadStudentList(); await loadPendingApprovals(); closeEditModal(); } else { editScheduleMsg.textContent = d.error || "Error resetting."; }
    } catch (err) { console.error("Error resetting schedule:", err); editScheduleMsg.textContent = "Network error while resetting."; }
  });

  // Delete student
  deleteStudentBtn && deleteStudentBtn.addEventListener("click", async () => {
    if (!counselorEditStudentID) return;
    if (!confirm("Delete this student and all their data? This cannot be undone.")) return;
    try {
      const r = await fetch("/api/counselor/delete_student", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_id: counselorEditStudentID }) });
      const d = await r.json();
      if (d.ok) { editScheduleMsg.textContent = "Student deleted."; closeEditModal(); await loadStudentList(); await loadPendingApprovals(); } else { editScheduleMsg.textContent = d.error || "Error deleting."; }
    } catch (err) { console.error("Error deleting student:", err); editScheduleMsg.textContent = "Network error while deleting."; }
  });

  // -------------------- Startup --------------------
  // Show student panel by default
  showOnly(studentPanel);
  if (studentScheduleArea) hide(studentScheduleArea);
  if (studentLoginArea) show(studentLoginArea);

})();