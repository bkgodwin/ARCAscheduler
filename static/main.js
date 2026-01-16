// static/main.js

//--------------------------------------------------
// Helpers
//--------------------------------------------------
function show(el){ if(!el) return; el.style.display = ""; }
function hide(el){ if(!el) return; el.style.display = "none"; }
function html(el, s){ if(!el) return; el.innerHTML = s; }
function text(el, t){ if(!el) return; el.textContent = t; }

function escapeHTML(str){
  return (str||"").replace(/&/g,"&amp;")
                  .replace(/</g,"&lt;")
                  .replace(/>/g,"&gt;")
                  .replace(/"/g,"&quot;");
}

function extractCodeFromDisplay(s){
  if(!s) return "";
  const m = s.match(/\(([^()]+)\)\s*$/);
  if(m) return m[1].trim();
  return s.trim();
}

function subjectToStyle(subjRaw, subjectColorsMap){
  let subj = subjRaw && subjRaw.trim() ? subjRaw.trim() : "Other";
  if (subjectColorsMap && subjectColorsMap[subj]) {
    return `background:${subjectColorsMap[subj]};`;
  }
  const fallback = (subjectColorsMap && subjectColorsMap["Other"]) || "#475569";
  return `background:${fallback};`;
}

function approvalClass(item){
  // item: {requires_approval, approval_status}
  if(!item || !item.requires_approval) return "";
  const st = (item.approval_status || "pending").toLowerCase();
  if(st === "approved") return "approvalApproved";
  if(st === "rejected") return "approvalRejected";
  return "approvalPending";
}

function approvalLabel(item){
  if(!item || !item.requires_approval) return "";
  const st = (item.approval_status || "pending").toLowerCase();
  if(st === "approved") return `<span class="approvalTag tagApproved">APPROVED</span>`;
  if(st === "rejected") return `<span class="approvalTag tagRejected">REJECTED</span>`;
  return `<span class="approvalTag tagPending">PENDING</span>`;
}

function moveItemUp(arr, idx){
  if(idx<=0) return;
  const tmp = arr[idx-1];
  arr[idx-1] = arr[idx];
  arr[idx] = tmp;
}
function moveItemDown(arr, idx){
  if(idx>=arr.length-1) return;
  const tmp = arr[idx+1];
  arr[idx+1] = arr[idx];
  arr[idx] = tmp;
}

//--------------------------------------------------
// DOM
//--------------------------------------------------
const studentModeBtn = document.getElementById("studentModeBtn");
const teacherModeBtn = document.getElementById("teacherModeBtn");
const counselorModeBtn = document.getElementById("counselorModeBtn");

const studentPanel = document.getElementById("studentPanel");
const teacherPanel = document.getElementById("teacherPanel");
const counselorPanel = document.getElementById("counselorPanel");

// student
const studentLoginArea = document.getElementById("studentLoginArea");
const studentNameInput = document.getElementById("studentNameInput");
const studentNameDropdown = document.getElementById("studentNameDropdown"); // now a <select>
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

// teacher
const teacherLoginArea = document.getElementById("teacherLoginArea");
const teacherDashboard = document.getElementById("teacherDashboard");
const teacherEmailInput = document.getElementById("teacherEmailInput");
const teacherPasswordInput = document.getElementById("teacherPasswordInput");
const teacherLoginBtn = document.getElementById("teacherLoginBtn");
const teacherLoginMsg = document.getElementById("teacherLoginMsg");
const teacherLogoutBtn = document.getElementById("teacherLogoutBtn");
const teacherInfo = document.getElementById("teacherInfo");
const teacherRosters = document.getElementById("teacherRosters");

// counselor
const counselorLoginArea = document.getElementById("counselorLoginArea");
const counselorDashboard = document.getElementById("counselorDashboard");
const counselorPassInput = document.getElementById("counselorPassInput");
const counselorLoginBtn = document.getElementById("counselorLoginBtn");
const counselorLoginMsg = document.getElementById("counselorLoginMsg");
const logoutCounselorBtn = document.getElementById("logoutCounselorBtn");

// settings + colors
const gradeLockControls = document.getElementById("gradeLockControls");
const saveGradeLocksBtn = document.getElementById("saveGradeLocksBtn");
const gradeLockMsg = document.getElementById("gradeLockMsg");

const subjectColorTbody = document.getElementById("subjectColorTbody");
const saveSubjectColorsBtn = document.getElementById("saveSubjectColorsBtn");
const colorSaveMsg = document.getElementById("colorSaveMsg");

// uploads
const studentsCsvInput = document.getElementById("studentsCsvInput");
const coursesCsvInput  = document.getElementById("coursesCsvInput");
const teachersCsvInput = document.getElementById("teachersCsvInput");
const uploadCsvBtn     = document.getElementById("uploadCsvBtn");
const uploadMsg = document.getElementById("uploadMsg");

// counselor list
const filterName   = document.getElementById("filterName");
const filterGrade  = document.getElementById("filterGrade");
const filterCourse = document.getElementById("filterCourse");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const exportFilteredBtn = document.getElementById("exportFilteredBtn");
const exportAllSchedulesBtn = document.getElementById("exportAllSchedulesBtn");
const studentCount = document.getElementById("studentCount");
const counselorStudentRows = document.getElementById("counselorStudentRows");
const printCardsSelectedBtn = document.getElementById("printCardsSelectedBtn");
const rosterCourseCode = document.getElementById("rosterCourseCode");
const rosterPrintBtn = document.getElementById("rosterPrintBtn");

// counselor pending approvals
const pendingApprovalCount = document.getElementById("pendingApprovalCount");
const pendingApprovalsList = document.getElementById("pendingApprovalsList");

// counselor edit
const editScheduleArea = document.getElementById("editScheduleArea");
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

// constants
if (maxAcademicSpan) maxAcademicSpan.textContent = MAX_ACADEMIC_COURSES;
if (maxElectiveSpan) maxElectiveSpan.textContent = MAX_ELECTIVE_CHOICES;
if (cMaxAcademicSpan) cMaxAcademicSpan.textContent = MAX_ACADEMIC_COURSES;
if (cMaxElectiveSpan) cMaxElectiveSpan.textContent = MAX_ELECTIVE_CHOICES;

//--------------------------------------------------
// State
//--------------------------------------------------
let subjectColors = {};
let currentStudentInfo = null;

let studentAcademic = []; // items: {display, course_code, subject_area, requires_approval, approval_status}
let studentElective = [];
let studentSpecial = "";

let counselorEditStudentID = null;
let counselorEditStudentName = null;
let counselorEditStudentGrade = null;
let counselorAcademicItems = [];
let counselorElectiveItems = [];

let lastStudentCourseSearch = [];
let lastCounselorCourseSearch = [];


//--------------------------------------------------
// Mode switching
//--------------------------------------------------
function showOnly(panel){
  hide(studentPanel);
  hide(teacherPanel);
  hide(counselorPanel);
  show(panel);
}

studentModeBtn.addEventListener("click", async ()=>{
  showOnly(studentPanel);
});

teacherModeBtn.addEventListener("click", async ()=>{
  showOnly(teacherPanel);
  await loadTeacherState();
});

counselorModeBtn.addEventListener("click", async ()=>{
  showOnly(counselorPanel);
  await loadCounselorState();
});


//--------------------------------------------------
// Load subject colors
//--------------------------------------------------
async function loadSubjectColors(){
  const r = await fetch("/api/counselor/settings");
  if(!r.ok) return;
  const d = await r.json();
  subjectColors = d.subject_colors || {};
}


//--------------------------------------------------
// STUDENT: login + schedule
//--------------------------------------------------
studentNameInput && studentNameInput.addEventListener("input", async ()=>{
  const q = studentNameInput.value.trim();
  if(q.length < 2){
    hide(studentNameDropdown);
    // clear options to avoid stale selections
    if(studentNameDropdown) studentNameDropdown.innerHTML = "";
    return;
  }

  try {
    const r = await fetch(`/api/student/find?q=${encodeURIComponent(q)}`);
    if(!r.ok) {
      hide(studentNameDropdown);
      if(studentNameDropdown) studentNameDropdown.innerHTML = "";
      return;
    }
    const d = await r.json();
    if(!d.matches || d.matches.length===0){
      hide(studentNameDropdown);
      if(studentNameDropdown) studentNameDropdown.innerHTML = "";
      return;
    }

    // populate select with options
    if(studentNameDropdown){
      studentNameDropdown.innerHTML = "";
      d.matches.forEach(m=>{
        const opt = document.createElement("option");
        opt.value = m.student_id;
        opt.textContent = `${m.student_name} (Grade ${m.grade_level})`;
        opt.dataset.name = m.student_name;
        opt.dataset.grade = m.grade_level;
        studentNameDropdown.appendChild(opt);
      });
      show(studentNameDropdown);
    }
  } catch (err) {
    console.error("Error fetching student suggestions:", err);
    hide(studentNameDropdown);
    if(studentNameDropdown) studentNameDropdown.innerHTML = "";
  }
});

// when the select changes, pick the selected student
studentNameDropdown && studentNameDropdown.addEventListener("change", ()=>{
  const opt = studentNameDropdown.selectedOptions[0];
  if(!opt) return;
  studentNameInput.value = opt.dataset.name || opt.textContent || "";
  studentNameInput.dataset.studentId = opt.value || "";
  hide(studentNameDropdown);
});

studentLoginBtn.addEventListener("click", async ()=>{
  const sid = studentNameInput.dataset.studentId || "";
  const check = studentIdCheckInput.value.trim();
  if(!sid || !check){
    studentLoginMsg.textContent = "Select your name and enter your ID.";
    return;
  }
  const r = await fetch("/api/student/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({student_id:sid, id_check:check})
  });
  const d = await r.json();
  if(!d.ok){
    studentLoginMsg.textContent = d.error || "Login failed.";
    return;
  }
  await loadStudentStatus();
});

studentSignOutBtn.addEventListener("click", async ()=>{
  await fetch("/api/student/logout", {method:"POST"});
  currentStudentInfo = null;
  studentAcademic = [];
  studentElective = [];
  studentSpecial = "";
  studentNameInput.value = "";
  studentNameInput.dataset.studentId = "";
  studentIdCheckInput.value = "";
  studentLoginMsg.textContent = "";
  hide(studentScheduleArea);
  show(studentLoginArea);
});

async function loadStudentStatus(){
  await loadSubjectColors();

  const r = await fetch("/api/student/status");
  const d = await r.json();
  if(!d.authed){
    studentLoginMsg.textContent = "Not authenticated.";
    return;
  }
  currentStudentInfo = d.student;
  studentAcademic = (d.schedule_items && d.schedule_items.academic) ? d.schedule_items.academic : [];
  studentElective = (d.schedule_items && d.schedule_items.elective) ? d.schedule_items.elective : [];
  studentSpecial = (d.schedule && d.schedule.special_instructions) ? d.schedule.special_instructions : "";

  const canSubmit = d.can_submit;

  studentInfoBlock.innerHTML = `
    <div><strong>${escapeHTML(currentStudentInfo.student_name)}</strong></div>
    <div>ID: ${escapeHTML(currentStudentInfo.student_id)}</div>
    <div>Grade: ${escapeHTML(currentStudentInfo.grade_level)}</div>
    <div>Submit allowed: ${canSubmit ? "Yes" : "Locked by counselor"}</div>
  `;

  specialInstructionsInput.value = studentSpecial;
  studentCardLink.href = `/schedule_card/${encodeURIComponent(currentStudentInfo.student_id)}`;

  renderSelectedStudentLists();
  hide(studentLoginArea);
  show(studentScheduleArea);
  await runStudentCourseSearch();
}

function renderSelectedStudentLists(){
  renderSelectedList(selectedAcademicList, studentAcademic, true);
  renderSelectedList(selectedElectiveList, studentElective, false);
}

function renderSelectedList(container, items, isAcademic){
  let out = "";
  items.forEach((it, idx)=>{
    const style = subjectToStyle(it.subject_area, subjectColors);
    const cls = approvalClass(it);

    if(isAcademic){
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
          <span class="priorityNum">#${idx+1}</span>
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

  if(items.length === 0){
    out = `<div class="dimtext">(none selected)</div>`;
  }

  container.innerHTML = out;

  container.querySelectorAll(".removeBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = parseInt(btn.dataset.idx);
      const type = btn.dataset.type;
      if(type === "acad"){
        studentAcademic.splice(idx,1);
      } else {
        studentElective.splice(idx,1);
      }
      renderSelectedStudentLists();
    });
  });

  container.querySelectorAll(".upBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = parseInt(btn.dataset.idx);
      moveItemUp(studentElective, idx);
      renderSelectedStudentLists();
    });
  });

  container.querySelectorAll(".downBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = parseInt(btn.dataset.idx);
      moveItemDown(studentElective, idx);
      renderSelectedStudentLists();
    });
  });
}

studentRunCourseSearchBtn.addEventListener("click", runStudentCourseSearch);

async function runStudentCourseSearch(){
  if(!currentStudentInfo) return;

  const params = new URLSearchParams();
  params.set("grade", currentStudentInfo.grade_level);
  if(studentFilterSubject.value.trim()){
    params.set("subject", studentFilterSubject.value.trim());
  }
  if(studentFilterName.value.trim()){
    params.set("name", studentFilterName.value.trim());
  }

  const r = await fetch(`/api/courses?${params.toString()}`);
  const d = await r.json();
  lastStudentCourseSearch = d.courses || [];

  let out = "";
  lastStudentCourseSearch.forEach(c=>{
    out += renderCourseCard(c);
  });
  studentAvailableCourses.innerHTML = out;

  studentAvailableCourses.querySelectorAll(".addCourseBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const code = btn.dataset.code;
      const found = lastStudentCourseSearch.find(x=>x.course_code === code);
      if(!found) return;

      const display = `${found.course_name} (${found.course_code})`;
      const item = {
        display,
        course_code: found.course_code,
        subject_area: found.subject_area || "Other",
        requires_approval: !!found.requires_approval,
        approval_status: found.requires_approval ? "pending" : "approved"
      };

      const isElective = (found.subject_area || "").toLowerCase().includes("cte") || (found.subject_area || "").toLowerCase().includes("elective");
      if(isElective){
        if(studentElective.length >= MAX_ELECTIVE_CHOICES) return;
        if(!studentElective.find(x=>x.course_code===item.course_code)) studentElective.push(item);
      } else {
        if(studentAcademic.length >= MAX_ACADEMIC_COURSES) return;
        if(!studentAcademic.find(x=>x.course_code===item.course_code)) studentAcademic.push(item);
      }
      renderSelectedStudentLists();
    });
  });
}

function renderCourseCard(c){
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

studentSaveBtn.addEventListener("click", async ()=>{
  if(!currentStudentInfo) return;

  const payload = {
    academic_courses: studentAcademic.map(x=>x.display),
    elective_courses: studentElective.map(x=>x.display),
    special_instructions: specialInstructionsInput.value.trim()
  };

  const r = await fetch("/api/student/save_schedule",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  const d = await r.json();
  if(d.ok){
    studentSaveMsg.textContent = "Saved! Approval-required courses will show PENDING until a teacher approves.";
    await loadStudentStatus(); // refresh statuses
  } else {
    studentSaveMsg.textContent = d.error || "Error saving schedule.";
  }
});


//--------------------------------------------------
// TEACHER: login + roster + approve/reject
//--------------------------------------------------
teacherLoginBtn.addEventListener("click", async ()=>{
  const email = teacherEmailInput.value.trim();
  const pw = teacherPasswordInput.value.trim();
  if(!email || !pw){
    teacherLoginMsg.textContent = "Enter email and password.";
    return;
  }
  const r = await fetch("/api/teacher/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({email, password: pw})
  });
  const d = await r.json();
  if(d.ok){
    teacherLoginMsg.textContent = "";
    await loadTeacherState();
  } else {
    teacherLoginMsg.textContent = d.error || "Login failed.";
  }
});

teacherLogoutBtn.addEventListener("click", async ()=>{
  await fetch("/api/teacher/logout", {method:"POST"});
  await loadTeacherState();
});

async function loadTeacherState(){
  await loadSubjectColors();

  const r = await fetch("/api/teacher/status");
  const d = await r.json();
  if(!d.authed){
    show(teacherLoginArea);
    hide(teacherDashboard);
    return;
  }

  hide(teacherLoginArea);
  show(teacherDashboard);

  teacherInfo.innerHTML = `
    <div><strong>${escapeHTML(d.teacher.teacher_name || "")}</strong></div>
    <div class="dimtext">${escapeHTML(d.teacher.teacher_email || "")}</div>
  `;

  await loadTeacherRoster();
}

async function loadTeacherRoster(){
  const r = await fetch("/api/teacher/roster");
  if(!r.ok){
    teacherRosters.innerHTML = `<div class="msg">Unable to load roster.</div>`;
    return;
  }
  const d = await r.json();
  const blocks = d.courses || [];

  if(blocks.length === 0){
    teacherRosters.innerHTML = `<div class="infoBlock">No courses assigned to your email in courses.csv.</div>`;
    return;
  }

  let out = "";
  blocks.forEach(b=>{
    const c = b.course;
    const style = subjectToStyle(c.subject_area || "Other", subjectColors);
    out += `
      <div class="teacherCourseBlock" data-course-code="${escapeHTML(c.course_code)}">
        <div class="teacherCourseHeader">
          <div>
            <div class="teacherCourseTitle">${escapeHTML(c.course_name)} <span class="dimtext">(${escapeHTML(c.course_code)})</span></div>
            <div class="dimtext">
              <span class="coursePill" style="${style}">${escapeHTML(c.subject_area || "Other")}</span>
              ${c.requires_approval ? `<span class="approvalTag tagPending">Requires Approval</span>` : `<span class="dimtext">No approvals required</span>`}
            </div>
          </div>
          <div class="teacherCourseActions">
            <button class="smallBtn edit-course-desc">Edit description</button>
          </div>
        </div>

        <div class="teacherCourseBody">
          <div class="course-description">${escapeHTML(c.description || "No description yet.")}</div>
          ${renderTeacherStudentTable(c, b.students || [])}
        </div>
      </div>
    `;
  });

  teacherRosters.innerHTML = out;

  // wire approval buttons
  teacherRosters.querySelectorAll(".teacherApproveBtn").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      await teacherSetApproval(btn.dataset.sid, btn.dataset.code, "approved");
    });
  });
  teacherRosters.querySelectorAll(".teacherRejectBtn").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      await teacherSetApproval(btn.dataset.sid, btn.dataset.code, "rejected");
    });
  });

  // wire edit-description buttons for each course block
  teacherRosters.querySelectorAll(".edit-course-desc").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      const courseBlock = btn.closest(".teacherCourseBlock");
      if(!courseBlock) return;
      openDescriptionEditorForBlock(courseBlock);
    });
  });
}

function renderTeacherStudentTable(course, students){
  if(students.length === 0){
    return `<div class="infoBlock">No students have this course on their schedule yet.</div>`;
  }

  let rows = "";
  students.forEach(s=>{
    const st = (s.approval_status || "pending").toLowerCase();
    let tag = `<span class="approvalTag tagPending">PENDING</span>`;
    if(st === "approved") tag = `<span class="approvalTag tagApproved">APPROVED</span>`;
    if(st === "rejected") tag = `<span class="approvalTag tagRejected">REJECTED</span>`;

    const showButtons = !!course.requires_approval;

    rows += `
      <tr>
        <td>${escapeHTML(s.student_name)}</td>
        <td>${escapeHTML(s.student_id)}</td>
        <td>${escapeHTML(s.grade_level)}</td>
        <td>${tag}</td>
        <td>
          ${showButtons ? `
            <button class="smallBtn teacherApproveBtn" data-sid="${escapeHTML(s.student_id)}" data-code="${escapeHTML(course.course_code)}">Approve</button>
            <button class="smallBtn danger teacherRejectBtn" data-sid="${escapeHTML(s.student_id)}" data-code="${escapeHTML(course.course_code)}">Reject</button>
          ` : `<span class="dimtext">N/A</span>`}
        </td>
      </tr>
    `;
  });

  return `
    <table class="simpleTable">
      <thead>
        <tr>
          <th>Student</th>
          <th>ID</th>
          <th>Grade</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function teacherSetApproval(student_id, course_code, status){
  const r = await fetch("/api/teacher/set_approval",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({student_id, course_code, status})
  });
  const d = await r.json();
  if(d.ok){
    await loadTeacherRoster();
  }
}

// -------------------------------------------------
// Course description editor utilities (teacher)
// -------------------------------------------------
function countWords(s){
  if(!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function openDescriptionEditorForBlock(courseBlock){
  const courseCode = courseBlock.dataset.courseCode || courseBlock.getAttribute("data-course-code");
  const descEl = courseBlock.querySelector(".course-description");
  const currentText = descEl ? descEl.textContent.trim() : "";

  // prevent duplicate editors
  if(courseBlock.querySelector(".description-editor")) return;

  if(descEl) descEl.style.display = "none";

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
  saveBtn.type = "button";
  saveBtn.className = "smallBtn";
  saveBtn.textContent = "Save";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "smallBtn";
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.marginLeft = "8px";

  controls.appendChild(saveBtn);
  controls.appendChild(cancelBtn);

  editor.appendChild(textarea);
  editor.appendChild(counter);
  editor.appendChild(controls);

  textarea.addEventListener("input", ()=>{
    counter.textContent = `Words: ${countWords(textarea.value)} / 100`;
  });

  cancelBtn.addEventListener("click", ()=>{
    editor.remove();
    if(descEl) descEl.style.display = "";
  });

  saveBtn.addEventListener("click", async ()=>{
    const newDesc = textarea.value.trim();
    const wc = countWords(newDesc);
    if(wc > 100){
      alert(`Description is too long (${wc} words). Maximum is 100 words.`);
      return;
    }

    saveBtn.disabled = true;
    try{
      const resp = await fetch("/api/teacher/update_course_description", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ course_code: courseCode, description: newDesc })
      });
      const data = await resp.json();
      if(resp.ok && data.ok){
        if(descEl){
          descEl.textContent = newDesc || "No description yet.";
          descEl.style.display = "";
        }
        editor.remove();
      } else {
        // show server error message if present
        const err = (data && data.error) ? data.error : "Failed to save description.";
        alert("Save failed: " + err);
      }
    } catch(err){
      console.error(err);
      alert("Network error while saving description.");
    } finally {
      saveBtn.disabled = false;
    }
  });

  courseBlock.appendChild(editor);
}

//--------------------------------------------------
// COUNSELOR: login + dashboard
//--------------------------------------------------
counselorLoginBtn.addEventListener("click", async ()=>{
  const pw = counselorPassInput.value.trim();
  const r = await fetch("/api/counselor/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({password: pw})
  });
  const d = await r.json();
  if(d.ok){
    counselorLoginMsg.textContent = "";
    await loadCounselorState();
  } else {
    counselorLoginMsg.textContent = "Login failed.";
  }
});

logoutCounselorBtn.addEventListener("click", async ()=>{
  await fetch("/api/counselor/logout", {method:"POST"});
  await loadCounselorState();
});

async function loadCounselorState(){
  await loadSubjectColors();

  const rTest = await fetch("/api/counselor/students");
  if(!rTest.ok){
    show(counselorLoginArea);
    hide(counselorDashboard);
    hide(logoutCounselorBtn);
    return;
  }

  hide(counselorLoginArea);
  show(counselorDashboard);
  show(logoutCounselorBtn);

  await loadGradeLocks();
  renderSubjectColorTable();
  await loadStudentList();
  await loadPendingApprovals();
}

async function loadGradeLocks(){
  const r = await fetch("/api/counselor/settings");
  if(!r.ok) return;
  const d = await r.json();
  const locks = d.grade_submission_lock || {};
  const order = ["9","10","11","12"];
  let out = `<table class="simpleTable"><thead><tr><th>Grade</th><th>Allow Submit?</th></tr></thead><tbody>`;
  order.forEach(g=>{
    out += `
      <tr>
        <td>${g}</td>
        <td><input type="checkbox" class="gradeLockCB" data-grade="${g}" ${locks[g] ? "checked":""}></td>
      </tr>
    `;
  });
  out += `</tbody></table>`;
  gradeLockControls.innerHTML = out;
}

saveGradeLocksBtn.addEventListener("click", async ()=>{
  const payload = {grade_submission_lock:{}};
  gradeLockControls.querySelectorAll(".gradeLockCB").forEach(cb=>{
    payload.grade_submission_lock[cb.dataset.grade] = cb.checked;
  });
  const r = await fetch("/api/counselor/settings",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  const d = await r.json();
  gradeLockMsg.textContent = d.ok ? "Saved." : "Error saving.";
});

function renderSubjectColorTable(){
  const subjects = Object.keys(subjectColors).length ? Object.keys(subjectColors) : ["ELA","Math","Science","Social Studies","PE/Health","CTE","Elective","Other"];
  let out = "";
  subjects.forEach(subj=>{
    const col = subjectColors[subj] || "#475569";
    out += `
      <tr>
        <td>${escapeHTML(subj)}</td>
        <td><input type="color" class="subjectColorInput" data-subj="${escapeHTML(subj)}" value="${escapeHTML(col)}"></td>
      </tr>
    `;
  });
  subjectColorTbody.innerHTML = out;
}

saveSubjectColorsBtn.addEventListener("click", async ()=>{
  const updated = {};
  subjectColorTbody.querySelectorAll(".subjectColorInput").forEach(inp=>{
    updated[inp.dataset.subj] = inp.value;
  });

  const r = await fetch("/api/counselor/settings",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({subject_colors: updated})
  });
  const d = await r.json();
  if(d.ok){
    colorSaveMsg.textContent = "Saved.";
    subjectColors = d.settings.subject_colors || subjectColors;
    renderSubjectColorTable();
    await loadStudentList();
  } else {
    colorSaveMsg.textContent = "Error saving.";
  }
});

uploadCsvBtn.addEventListener("click", async ()=>{
  const fd = new FormData();
  if(studentsCsvInput.files[0]) fd.append("studentsCsv", studentsCsvInput.files[0]);
  if(coursesCsvInput.files[0]) fd.append("coursesCsv", coursesCsvInput.files[0]);
  if(teachersCsvInput.files[0]) fd.append("teachersCsv", teachersCsvInput.files[0]);

  const r = await fetch("/api/counselor/upload_csv", {method:"POST", body: fd});
  const d = await r.json();
  if(d.ok){
    uploadMsg.textContent = "Upload complete.";
    await loadStudentList();
    await loadPendingApprovals();
  } else {
    uploadMsg.textContent = "Upload failed.";
  }
});

applyFiltersBtn.addEventListener("click", async ()=>{
  await loadStudentList();
});

async function loadStudentList(){
  const params = new URLSearchParams();
  if(filterName.value.trim()) params.set("q_name", filterName.value.trim());
  if(filterGrade.value.trim()) params.set("grade", filterGrade.value.trim());
  if(filterCourse.value.trim()) params.set("course", filterCourse.value.trim());

  const r = await fetch(`/api/counselor/students?${params.toString()}`);
  const d = await r.json();

  studentCount.textContent = `Total in view: ${d.total}`;

  let out = "";
  (d.students || []).forEach(stu=>{
    const rowClass = stu.scheduled ? "studentRowScheduled" : "studentRowNotScheduled";

    let chipsHTML = "";
    (stu.academic_courses || []).slice(0,2).forEach(cn=>{
      chipsHTML += `<span class="courseChip" style="${subjectToStyle("Other",subjectColors)}">${escapeHTML(cn)}</span> `;
    });
    if((stu.academic_courses || []).length > 2){
      chipsHTML += `<span class="courseChip" style="${subjectToStyle("Other",subjectColors)}">+${(stu.academic_courses || []).length-2} more</span>`;
    }

    const approvalsSummary = `
      <span class="approvalMini">Pending: <strong>${stu.pending_approvals || 0}</strong></span>
      <span class="approvalMini">Rejected: <strong>${stu.rejected_approvals || 0}</strong></span>
    `;

    out += `
      <tr class="${rowClass}">
        <td><input type="checkbox" class="selectStudentCB" data-id="${escapeHTML(stu.student_id)}"></td>
        <td>
          <div class="boldish">${escapeHTML(stu.student_name)}</div>
          <div class="dimtext">ID: ${escapeHTML(stu.student_id)} • Grade ${escapeHTML(stu.grade_level)}</div>
        </td>
        <td>${chipsHTML}</td>
        <td>${escapeHTML(stu.top_elective || "")}</td>
        <td>${approvalsSummary}</td>
        <td>
          <button class="smallBtn editBtn" data-id="${escapeHTML(stu.student_id)}">Edit</button>
          <a class="buttonlike small" href="/schedule_card/${encodeURIComponent(stu.student_id)}" target="_blank">Card</a>
        </td>
      </tr>
    `;
  });

  counselorStudentRows.innerHTML = out;

  counselorStudentRows.querySelectorAll(".editBtn").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      await openCounselorEditSchedule(btn.dataset.id);
    });
  });
}

exportFilteredBtn.addEventListener("click", ()=>{
  const params = new URLSearchParams();
  if(filterName.value.trim()) params.set("q_name", filterName.value.trim());
  if(filterGrade.value.trim()) params.set("grade", filterGrade.value.trim());
  if(filterCourse.value.trim()) params.set("course", filterCourse.value.trim());
  window.open(`/api/counselor/export_filtered?${params.toString()}`, "_blank");
});

exportAllSchedulesBtn.addEventListener("click", ()=>{
  window.open("/api/counselor/export_all_schedules", "_blank");
});

printCardsSelectedBtn.addEventListener("click", ()=>{
  counselorStudentRows.querySelectorAll(".selectStudentCB:checked").forEach(cb=>{
    window.open(`/schedule_card/${encodeURIComponent(cb.dataset.id)}`, "_blank");
  });
});

rosterPrintBtn.addEventListener("click", ()=>{
  const code = rosterCourseCode.value.trim();
  if(!code) return;
  window.open(`/roster/${encodeURIComponent(code)}`, "_blank");
});

async function loadPendingApprovals(){
  const r = await fetch("/api/counselor/pending_approvals");
  if(!r.ok){
    pendingApprovalCount.textContent = "";
    pendingApprovalsList.innerHTML = `<div class="msg">Unable to load pending approvals.</div>`;
    return;
  }
  const d = await r.json();
  pendingApprovalCount.textContent = `Pending approvals: ${d.total}`;

  if((d.pending || []).length === 0){
    pendingApprovalsList.innerHTML = `<div class="infoBlock">No pending approvals.</div>`;
    return;
  }

  let rows = "";
  d.pending.forEach(p=>{
    rows += `
      <tr>
        <td>${escapeHTML(p.course_name)} <span class="dimtext">(${escapeHTML(p.course_code)})</span></td>
        <td>${escapeHTML(p.student_name)} <span class="dimtext">(${escapeHTML(p.student_id)})</span></td>
        <td>${escapeHTML(p.grade_level)}</td>
        <td>${escapeHTML(p.teacher_email || "")}</td>
        <td class="dimtext">${escapeHTML(p.updated_at || "")}</td>
      </tr>
    `;
  });

  pendingApprovalsList.innerHTML = `
    <table class="simpleTable">
      <thead>
        <tr><th>Course</th><th>Student</th><th>Grade</th><th>Teacher</th><th>Last Updated</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}


//--------------------------------------------------
// COUNSELOR EDIT SCHEDULE (with approval labels)
//--------------------------------------------------
async function openCounselorEditSchedule(student_id){
  const r = await fetch(`/api/counselor/get_schedule?student_id=${encodeURIComponent(student_id)}`);
  const d = await r.json();
  if(!d.schedule) return;

  counselorEditStudentID = d.schedule.student_id;
  counselorEditStudentName = d.schedule.student_name;
  counselorEditStudentGrade = d.schedule.grade_level;

  counselorAcademicItems = (d.schedule_items && d.schedule_items.academic) ? d.schedule_items.academic : [];
  counselorElectiveItems = (d.schedule_items && d.schedule_items.elective) ? d.schedule_items.elective : [];
  counselorNotesInput.value = (d.schedule.special_instructions || "");

  editScheduleInfo.innerHTML = `
    <div><strong>${escapeHTML(counselorEditStudentName)}</strong> (ID: ${escapeHTML(counselorEditStudentID)}) Grade ${escapeHTML(counselorEditStudentGrade)}</div>
  `;

  renderCounselorSelectedLists();
  show(editScheduleArea);
  await runCounselorCourseSearch();
}

function renderCounselorSelectedLists(){
  renderCounselorList(cSelectedAcademicList, counselorAcademicItems, true);
  renderCounselorList(cSelectedElectiveList, counselorElectiveItems, false);
}

function renderCounselorList(container, items, isAcademic){
  let out = "";
  items.forEach((it, idx)=>{
    const style = subjectToStyle(it.subject_area, subjectColors);
    const cls = approvalClass(it);

    if(isAcademic){
      out += `
        <div class="selectedRow ${cls}">
          <span class="courseChip" style="${style}">
            ${escapeHTML(it.display)} ${approvalLabel(it)}
          </span>
          <button class="smallBtn removeCounselorBtn" data-idx="${idx}" data-type="acad">Remove</button>
        </div>
      `;
    } else {
      out += `
        <div class="selectedRow ${cls}">
          <span class="priorityNum">#${idx+1}</span>
          <span class="courseChip" style="${style}">
            ${escapeHTML(it.display)} ${approvalLabel(it)}
          </span>
          <div class="electiveBtns">
            <button class="smallBtn upCounselorBtn" data-idx="${idx}">▲</button>
            <button class="smallBtn downCounselorBtn" data-idx="${idx}">▼</button>
            <button class="smallBtn removeCounselorBtn" data-idx="${idx}" data-type="elec">Remove</button>
          </div>
        </div>
      `;
    }
  });
  if(items.length===0) out = `<div class="dimtext">(none selected)</div>`;
  container.innerHTML = out;

  container.querySelectorAll(".removeCounselorBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = parseInt(btn.dataset.idx);
      const type = btn.dataset.type;
      if(type === "acad") counselorAcademicItems.splice(idx,1);
      else counselorElectiveItems.splice(idx,1);
      renderCounselorSelectedLists();
    });
  });
  container.querySelectorAll(".upCounselorBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      moveItemUp(counselorElectiveItems, parseInt(btn.dataset.idx));
      renderCounselorSelectedLists();
    });
  });
  container.querySelectorAll(".downCounselorBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      moveItemDown(counselorElectiveItems, parseInt(btn.dataset.idx));
      renderCounselorSelectedLists();
    });
  });
}

cRunCourseSearchBtn.addEventListener("click", runCounselorCourseSearch);

async function runCounselorCourseSearch(){
  if(!counselorEditStudentGrade) return;

  const params = new URLSearchParams();
  params.set("grade", counselorEditStudentGrade);
  if(cFilterSubject.value.trim()) params.set("subject", cFilterSubject.value.trim());
  if(cFilterNameSearch.value.trim()) params.set("name", cFilterNameSearch.value.trim());

  const r = await fetch(`/api/courses?${params.toString()}`);
  const d = await r.json();
  lastCounselorCourseSearch = d.courses || [];

  let out = "";
  lastCounselorCourseSearch.forEach(c=>{
    out += renderCourseCard(c);
  });
  cAvailableCoursesGrid.innerHTML = out;

  cAvailableCoursesGrid.querySelectorAll(".addCourseBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const code = btn.dataset.code;
      const found = lastCounselorCourseSearch.find(x=>x.course_code === code);
      if(!found) return;

      const display = `${found.course_name} (${found.course_code})`;
      const item = {
        display,
        course_code: found.course_code,
        subject_area: found.subject_area || "Other",
        requires_approval: !!found.requires_approval,
        approval_status: found.requires_approval ? "pending" : "approved"
      };

      const isElective = (found.subject_area || "").toLowerCase().includes("cte") || (found.subject_area || "").toLowerCase().includes("elective");
      if(isElective){
        if(counselorElectiveItems.length >= MAX_ELECTIVE_CHOICES) return;
        if(!counselorElectiveItems.find(x=>x.course_code===item.course_code)) counselorElectiveItems.push(item);
      } else {
        if(counselorAcademicItems.length >= MAX_ACADEMIC_COURSES) return;
        if(!counselorAcademicItems.find(x=>x.course_code===item.course_code)) counselorAcademicItems.push(item);
      }

      renderCounselorSelectedLists();
    });
  });
}

saveCounselorScheduleBtn.addEventListener("click", async ()=>{
  if(!counselorEditStudentID) return;

  const payload = {
    student_id: counselorEditStudentID,
    student_name: counselorEditStudentName,
    grade_level: counselorEditStudentGrade,
    academic_courses: counselorAcademicItems.map(x=>x.display),
    elective_courses: counselorElectiveItems.map(x=>x.display),
    special_instructions: counselorNotesInput.value.trim()
  };

  const r = await fetch("/api/counselor/save_schedule",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  const d = await r.json();
  editScheduleMsg.textContent = d.ok ? "Saved." : (d.error || "Error saving.");
  if(d.ok){
    await loadStudentList();
    await loadPendingApprovals();
    // re-open to refresh approval statuses
    await openCounselorEditSchedule(counselorEditStudentID);
  }
});

resetScheduleBtn.addEventListener("click", async ()=>{
  if(!counselorEditStudentID) return;
  const r = await fetch("/api/counselor/reset_schedule",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({student_id: counselorEditStudentID})
  });
  const d = await r.json();
  if(d.ok){
    editScheduleMsg.textContent = "Schedule reset.";
    counselorAcademicItems = [];
    counselorElectiveItems = [];
    counselorNotesInput.value = "";
    renderCounselorSelectedLists();
    await loadStudentList();
    await loadPendingApprovals();
  } else {
    editScheduleMsg.textContent = d.error || "Error resetting.";
  }
});

deleteStudentBtn.addEventListener("click", async ()=>{
  if(!counselorEditStudentID) return;
  const r = await fetch("/api/counselor/delete_student",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({student_id: counselorEditStudentID})
  });
  const d = await r.json();
  if(d.ok){
    editScheduleMsg.textContent = "Student deleted.";
    hide(editScheduleArea);
    await loadStudentList();
    await loadPendingApprovals();
  } else {
    editScheduleMsg.textContent = d.error || "Error deleting.";
  }
});


//--------------------------------------------------
// Default landing
//--------------------------------------------------
showOnly(studentPanel);
hide(studentScheduleArea);
show(studentLoginArea);