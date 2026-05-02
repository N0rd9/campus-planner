const STORAGE_KEY = "campus-planner-state";

const state = loadState();

const elements = {
  tabs: document.querySelectorAll(".tab"),
  courseForm: document.querySelector("#course-form"),
  assignmentForm: document.querySelector("#assignment-form"),
  courseList: document.querySelector("#course-list"),
  assignmentList: document.querySelector("#assignment-list"),
  assignmentCourse: document.querySelector("#assignment-course"),
  courseCount: document.querySelector("#course-count"),
  assignmentCount: document.querySelector("#assignment-count"),
  gpaValue: document.querySelector("#gpa-value"),
  seedDemo: document.querySelector("#seed-demo"),
  clearDone: document.querySelector("#clear-done"),
};

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

elements.courseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const course = {
    id: crypto.randomUUID(),
    name: document.querySelector("#course-name").value.trim(),
    instructor: document.querySelector("#course-instructor").value.trim(),
    credits: Number(document.querySelector("#course-credits").value),
    grade: Number(document.querySelector("#course-grade").value),
  };

  state.courses.push(course);
  elements.courseForm.reset();
  document.querySelector("#course-credits").value = 3;
  saveAndRender();
});

elements.assignmentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.courses.length === 0) return;

  const assignment = {
    id: crypto.randomUUID(),
    title: document.querySelector("#assignment-title").value.trim(),
    courseId: document.querySelector("#assignment-course").value,
    due: document.querySelector("#assignment-due").value,
    priority: document.querySelector("#assignment-priority").value,
    done: false,
  };

  state.assignments.push(assignment);
  elements.assignmentForm.reset();
  saveAndRender();
});

elements.seedDemo.addEventListener("click", () => {
  state.courses = [
    {
      id: "course-data-structures",
      name: "Data Structures",
      instructor: "Dr. Ramos",
      credits: 4,
      grade: 3.7,
    },
    {
      id: "course-statistics",
      name: "Applied Statistics",
      instructor: "Prof. Costa",
      credits: 3,
      grade: 3.3,
    },
    {
      id: "course-writing",
      name: "Technical Writing",
      instructor: "Dr. Lima",
      credits: 2,
      grade: 4.0,
    },
  ];
  state.assignments = [
    {
      id: "task-algorithms",
      title: "Algorithm analysis worksheet",
      courseId: "course-data-structures",
      due: nextDate(3),
      priority: "High",
      done: false,
    },
    {
      id: "task-survey",
      title: "Survey data cleaning",
      courseId: "course-statistics",
      due: nextDate(6),
      priority: "Medium",
      done: false,
    },
  ];
  saveAndRender();
});

elements.clearDone.addEventListener("click", () => {
  state.assignments = state.assignments.filter((assignment) => !assignment.done);
  saveAndRender();
});

function switchTab(name) {
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === name);
  });
  elements.courseForm.classList.toggle("active", name === "course");
  elements.assignmentForm.classList.toggle("active", name === "assignment");
}

function render() {
  renderCourses();
  renderAssignments();
  renderSummary();
  renderCourseOptions();
}

function renderCourses() {
  elements.courseList.innerHTML = "";

  if (state.courses.length === 0) {
    elements.courseList.append(emptyState("No courses yet. Add your first class or load demo data."));
    return;
  }

  const template = document.querySelector("#course-template");
  state.courses.forEach((course) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector("h3").textContent = course.name;
    node.querySelector("p").textContent = `${course.instructor} · ${course.credits} credits`;
    node.querySelector(".metric").textContent = gradeLabel(course.grade);
    node.querySelector("button").addEventListener("click", () => deleteCourse(course.id));
    elements.courseList.append(node);
  });
}

function renderAssignments() {
  elements.assignmentList.innerHTML = "";

  if (state.assignments.length === 0) {
    elements.assignmentList.append(emptyState("No assignments yet. Add a deadline to start tracking work."));
    return;
  }

  const template = document.querySelector("#assignment-template");
  sortedAssignments().forEach((assignment) => {
    const course = state.courses.find((item) => item.id === assignment.courseId);
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.toggle("done", assignment.done);
    node.querySelector("input").checked = assignment.done;
    node.querySelector("input").addEventListener("change", (event) => {
      assignment.done = event.target.checked;
      saveAndRender();
    });
    node.querySelector(".checkline span").textContent = assignment.title;
    node.querySelector("p").textContent = `${course?.name || "Unknown course"} · due ${formatDate(assignment.due)}`;
    const badge = node.querySelector("strong");
    badge.textContent = assignment.priority;
    badge.className = assignment.priority.toLowerCase();
    node.querySelector("button").addEventListener("click", () => deleteAssignment(assignment.id));
    elements.assignmentList.append(node);
  });
}

function renderSummary() {
  const openAssignments = state.assignments.filter((assignment) => !assignment.done);
  elements.courseCount.textContent = state.courses.length;
  elements.assignmentCount.textContent = openAssignments.length;
  elements.gpaValue.textContent = calculateGpa().toFixed(2);
}

function renderCourseOptions() {
  elements.assignmentCourse.innerHTML = "";
  if (state.courses.length === 0) {
    const option = new Option("Add a course first", "");
    elements.assignmentCourse.add(option);
    elements.assignmentCourse.disabled = true;
    return;
  }

  elements.assignmentCourse.disabled = false;
  state.courses.forEach((course) => {
    elements.assignmentCourse.add(new Option(course.name, course.id));
  });
}

function deleteCourse(id) {
  state.courses = state.courses.filter((course) => course.id !== id);
  state.assignments = state.assignments.filter((assignment) => assignment.courseId !== id);
  saveAndRender();
}

function deleteAssignment(id) {
  state.assignments = state.assignments.filter((assignment) => assignment.id !== id);
  saveAndRender();
}

function sortedAssignments() {
  return [...state.assignments].sort((first, second) => {
    if (first.done !== second.done) return Number(first.done) - Number(second.done);
    return new Date(first.due) - new Date(second.due);
  });
}

function calculateGpa() {
  const totalCredits = state.courses.reduce((sum, course) => sum + course.credits, 0);
  if (totalCredits === 0) return 0;

  const weighted = state.courses.reduce(
    (sum, course) => sum + course.grade * course.credits,
    0,
  );
  return weighted / totalCredits;
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { courses: [], assignments: [] };

  try {
    const parsed = JSON.parse(saved);
    return {
      courses: Array.isArray(parsed.courses) ? parsed.courses : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
    };
  } catch {
    return { courses: [], assignments: [] };
  }
}

function emptyState(message) {
  const element = document.createElement("div");
  element.className = "empty-state";
  element.textContent = message;
  return element;
}

function gradeLabel(value) {
  const labels = {
    4: "A",
    3.7: "A-",
    3.3: "B+",
    3: "B",
    2.7: "B-",
    2.3: "C+",
    2: "C",
    1: "D",
    0: "F",
  };
  return labels[value] || value.toFixed(1);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function nextDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

render();
