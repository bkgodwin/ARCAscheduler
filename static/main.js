// static/main.js

//--------------------------------------------------
// Helpers
//--------------------------------------------------
function show(el){ el.style.display = ""; }
function hide(el){ el.style.display = "none"; }
function html(el, s){ el.innerHTML = s; }
function text(el, t){ el.textContent = t; }

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
const studentNameDropdown = document.getElementById("studentNameDropdown");
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
maxAcademicSpan.textContent = MAX_ACADEMIC_COURSES;
maxElectiveSpan.textContent = MAX_ELECTIVE_CHOICES;
cMaxAcademicSpan.textContent = MAX_ACADEMIC_COURSES;
cMaxElectiveSpan.textContent = MAX_ELECTIVE_CHOICES;

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
// ... (student code unchanged; omitted here for brevity in this snippet)
// The rest of the file up through the student functions is identical to original except where teacher UI code follows.
// (You still have the original student code earlier in your file; keep it as-is.)
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
// COUNSELOR and other code unchanged beyond this point.
// (Keep the rest of your original main.js as-is.)
//--------------------------------------------------

// Default landing
showOnly(studentPanel);
hide(studentScheduleArea);
show(studentLoginArea);