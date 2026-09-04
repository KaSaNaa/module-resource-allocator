import React, { useEffect, useMemo, useState } from "react";
import "./styles/index.css";

const STORAGE_KEY = "rosterly-workspace-data";
const ACTIVE_VIEW_STORAGE_KEY = "rosterly-active-view";
const availableViews = [
  "Overview",
  "Employees",
  "Jobs",
  "Allocation Lab",
  "Reports",
];
const measureAllocation = (algorithm, items, capacity) => {
  const startedAt = performance.now();
  const result = algorithm(items, capacity);
  return {
    ...result,
    executionTimeMs: Number((performance.now() - startedAt).toFixed(3)),
  };
};

const solveExact = (items, capacity) => {
  const table = Array.from({ length: items.length + 1 }, () =>
    Array(capacity + 1).fill(0),
  );
  for (let itemIndex = 1; itemIndex <= items.length; itemIndex += 1) {
    const item = items[itemIndex - 1];
    for (let budget = 0; budget <= capacity; budget += 1) {
      table[itemIndex][budget] =
        item.cost <= budget
          ? Math.max(
              table[itemIndex - 1][budget],
              table[itemIndex - 1][budget - item.cost] + item.value,
            )
          : table[itemIndex - 1][budget];
    }
  }
  const selectedIds = [];
  let budget = capacity;
  for (let itemIndex = items.length; itemIndex > 0; itemIndex -= 1) {
    if (table[itemIndex][budget] !== table[itemIndex - 1][budget]) {
      selectedIds.unshift(items[itemIndex - 1].id);
      budget -= items[itemIndex - 1].cost;
    }
  }
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  return {
    selectedItems,
    totalCost: selectedItems.reduce((sum, item) => sum + item.cost, 0),
    totalValue: table[items.length][capacity],
    memoryFootprint: (items.length + 1) * (capacity + 1),
    approach: "Exact optimum",
  };
};

const solveGreedy = (items, capacity) => {
  const selectedItems = [];
  let totalCost = 0;
  [...items]
    .sort((a, b) => b.value / b.cost - a.value / a.cost)
    .forEach((item) => {
      if (totalCost + item.cost <= capacity) {
        selectedItems.push(item);
        totalCost += item.cost;
      }
    });
  return {
    selectedItems,
    totalCost: selectedItems.reduce((sum, item) => sum + item.cost, 0),
    totalValue: selectedItems.reduce((sum, item) => sum + item.value, 0),
    memoryFootprint: items.length,
    approach: "Fast heuristic",
  };
};

const solveGenetic = (items, capacity) => {
  const populationSize = 36;
  const generations = 50;
  const repair = (candidate) => {
    const repaired = [...candidate];
    while (
      items
        .filter((_, index) => repaired[index])
        .reduce((sum, item) => sum + item.cost, 0) > capacity
    ) {
      const selectedIndexes = items
        .map((item, index) => ({ item, index }))
        .filter(({ index }) => repaired[index]);
      const lowestRatio = selectedIndexes.sort(
        (a, b) => a.item.value / a.item.cost - b.item.value / b.item.cost,
      )[0];
      repaired[lowestRatio.index] = false;
    }
    return repaired;
  };
  const fitness = (candidate) => {
    const selectedItems = items.filter((_, index) => candidate[index]);
    const totalCost = selectedItems.reduce((sum, item) => sum + item.cost, 0);
    return totalCost <= capacity
      ? selectedItems.reduce((sum, item) => sum + item.value, 0)
      : 0;
  };
  let population = Array.from({ length: populationSize }, () =>
    repair(items.map(() => Math.random() > 0.5)),
  );
  const convergenceHistory = [];
  for (let generation = 0; generation < generations; generation += 1) {
    population.sort((a, b) => fitness(b) - fitness(a));
    convergenceHistory.push(fitness(population[0]));
    const nextPopulation = [population[0]];
    while (nextPopulation.length < populationSize) {
      const tournament = () => {
        const candidates = Array.from(
          { length: 3 },
          () => population[Math.floor(Math.random() * population.length)],
        );
        return candidates.sort((a, b) => fitness(b) - fitness(a))[0];
      };
      const firstParent = tournament();
      const secondParent = tournament();
      const crossoverPoint =
        1 + Math.floor(Math.random() * Math.max(1, items.length - 1));
      const child = firstParent
        .map((gene, index) =>
          index < crossoverPoint ? gene : secondParent[index],
        )
        .map((gene) => (Math.random() < 0.05 ? !gene : gene));
      nextPopulation.push(repair(child));
    }
    population = nextPopulation;
  }
  population.sort((a, b) => fitness(b) - fitness(a));
  const selectedItems = items.filter((_, index) => population[0][index]);
  return {
    selectedItems,
    totalCost: selectedItems.reduce((sum, item) => sum + item.cost, 0),
    totalValue: fitness(population[0]),
    memoryFootprint: populationSize * items.length,
    convergenceHistory,
    approach: "Estimated solution",
  };
};

const starterEmployees = [
  {
    id: 1,
    name: "Maya Chen",
    role: "Senior Designer",
    skills: ["UX design", "Figma", "Research"],
    status: "Available",
    location: "Colombo",
  },
  {
    id: 2,
    name: "Daniel Perera",
    role: "Frontend Developer",
    skills: ["React", "JavaScript", "CSS"],
    status: "Available",
    location: "Kandy",
  },
  {
    id: 3,
    name: "Aisha Fernando",
    role: "Data Analyst",
    skills: ["SQL", "Excel", "Reporting"],
    status: "On a job",
    location: "Colombo",
  },
  {
    id: 4,
    name: "Ravi Kumar",
    role: "Backend Developer",
    skills: ["Node.js", "APIs", "Databases"],
    status: "Available",
    location: "Galle",
  },
  {
    id: 5,
    name: "Sofia Williams",
    role: "Project Coordinator",
    skills: ["Planning", "Communication", "Reporting"],
    status: "Available",
    location: "Colombo",
  },
];

const starterJobs = [
  {
    id: 101,
    title: "Customer portal redesign",
    client: "Harbor & Co.",
    due: "18 Sep 2026",
    priority: "High",
    skills: ["UX design", "Figma"],
    assignedTo: null,
  },
  {
    id: 102,
    title: "Sales dashboard build",
    client: "Northstar Retail",
    due: "24 Sep 2026",
    priority: "Medium",
    skills: ["React", "JavaScript"],
    assignedTo: null,
  },
  {
    id: 103,
    title: "Monthly performance report",
    client: "Internal team",
    due: "12 Sep 2026",
    priority: "Low",
    skills: ["Excel", "Reporting"],
    assignedTo: 3,
  },
];

const loadWorkspaceData = () => {
  if (typeof window === "undefined") {
    return { employees: starterEmployees, jobs: starterJobs };
  }

  try {
    const savedData = window.localStorage.getItem(STORAGE_KEY);
    if (!savedData) return { employees: starterEmployees, jobs: starterJobs };

    const parsedData = JSON.parse(savedData);
    return {
      employees: Array.isArray(parsedData.employees)
        ? parsedData.employees
        : starterEmployees,
      jobs: Array.isArray(parsedData.jobs) ? parsedData.jobs : starterJobs,
    };
  } catch {
    return { employees: starterEmployees, jobs: starterJobs };
  }
};

const loadActiveView = () => {
  if (typeof window === "undefined") return "Overview";

  try {
    const savedView = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
    return availableViews.includes(savedView) ? savedView : "Overview";
  } catch {
    return "Overview";
  }
};

function App() {
  const [workspaceData, setWorkspaceData] = useState(loadWorkspaceData);
  const { employees, jobs } = workspaceData;
  const [activeView, setActiveView] = useState(loadActiveView);
  const [selectedJobId, setSelectedJobId] = useState(101);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [allocationAlgorithm, setAllocationAlgorithm] = useState("EXACT_DP");
  const [allocationResult, setAllocationResult] = useState(null);
  const [comparisonResults, setComparisonResults] = useState([]);
  const [benchmarkResults, setBenchmarkResults] = useState([]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaceData));
    } catch {
      setNotice(
        "Your changes are active, but this browser could not save them.",
      );
    }
  }, [workspaceData]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView);
    } catch {
      setNotice("Your page choice could not be saved in this browser.");
    }
  }, [activeView]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || jobs[0];
  const availableCount = employees.filter(
    (employee) => employee.status === "Available",
  ).length;
  const openJobs = jobs.filter((job) => !job.assignedTo).length;
  const assignedThisWeek = jobs.filter((job) => job.assignedTo).length;
  const allocationItems = useMemo(
    () =>
      jobs.map((job) => ({
        id: job.id,
        name: job.title,
        cost: Math.max(
          4,
          job.skills.length * 4 +
            (job.priority === "High" ? 4 : job.priority === "Medium" ? 2 : 0),
        ),
        value:
          job.skills.length * 15 +
          (job.priority === "High" ? 35 : job.priority === "Medium" ? 20 : 10),
      })),
    [jobs],
  );
  const availableCapacity = Math.max(40, availableCount * 8);

  const recommendations = useMemo(() => {
    if (!selectedJob) return [];
    return employees
      .map((employee) => ({
        ...employee,
        matchedSkills: employee.skills.filter((skill) =>
          selectedJob.skills.includes(skill),
        ),
      }))
      .filter((employee) => employee.status === "Available")
      .sort((a, b) => b.matchedSkills.length - a.matchedSkills.length);
  }, [employees, selectedJob]);

  const allocationAlgorithms = {
    EXACT_DP: { label: "Exact dynamic programming", solver: solveExact },
    HEURISTIC_GREEDY: {
      label: "Greedy value-to-cost ratio",
      solver: solveGreedy,
    },
    APPROX_GA: { label: "Genetic approximation", solver: solveGenetic },
  };

  const runAllocation = () => {
    const result = measureAllocation(
      allocationAlgorithms[allocationAlgorithm].solver,
      allocationItems,
      availableCapacity,
    );
    setAllocationResult({ ...result, algorithm: allocationAlgorithm });
    setComparisonResults([]);
    setNotice(
      `${allocationAlgorithms[allocationAlgorithm].label} completed within the ${availableCapacity}-hour capacity.`,
    );
  };

  const compareAllocations = () => {
    const results = Object.entries(allocationAlgorithms).map(
      ([algorithm, details]) => ({
        ...measureAllocation(
          details.solver,
          allocationItems,
          availableCapacity,
        ),
        algorithm,
        label: details.label,
      }),
    );
    const optimum = results[0].totalValue;
    setComparisonResults(
      results.map((result) => ({
        ...result,
        optimalityGap: optimum
          ? ((optimum - result.totalValue) / optimum) * 100
          : 0,
      })),
    );
    setAllocationResult(null);
    setNotice(
      "All three approaches have been compared using the same work plan.",
    );
  };

  const benchmarkAllocations = () => {
    const sizes = [8, 16, 32, 64, 96];
    const results = sizes.map((size) => {
      const items = Array.from({ length: size }, (_, index) => ({
        id: index,
        name: `Work item ${index + 1}`,
        cost: 4 + (index % 17),
        value: 20 + ((index * 13) % 80),
      }));
      const result = measureAllocation(
        allocationAlgorithms[allocationAlgorithm].solver,
        items,
        Math.floor(size * 5),
      );
      return { size, ...result };
    });
    setBenchmarkResults(results);
    setNotice("Scaling test completed across five work-plan sizes.");
  };

  const assignEmployee = (employee) => {
    if (!selectedJob) return;
    setWorkspaceData((current) => ({
      employees: current.employees.map((person) =>
        person.id === employee.id ? { ...person, status: "On a job" } : person,
      ),
      jobs: current.jobs.map((job) =>
        job.id === selectedJob.id ? { ...job, assignedTo: employee.id } : job,
      ),
    }));
    setNotice(`${employee.name} is now assigned to ${selectedJob.title}.`);
  };

  const addEmployee = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const skills = String(form.get("skills"))
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
    setWorkspaceData((current) => ({
      ...current,
      employees: [
        ...current.employees,
        {
          id: Date.now(),
          name: form.get("name"),
          role: form.get("role"),
          skills,
          status: "Available",
          location: form.get("location"),
        },
      ],
    }));
    setShowEmployeeForm(false);
    setNotice("Employee added to your available team.");
  };

  const addJob = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const job = {
      id: Date.now(),
      title: form.get("title"),
      client: form.get("client"),
      due: form.get("due"),
      priority: form.get("priority"),
      skills: String(form.get("skills"))
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      assignedTo: null,
    };
    setWorkspaceData((current) => ({
      ...current,
      jobs: [...current.jobs, job],
    }));
    setSelectedJobId(job.id);
    setAllocationResult(null);
    setComparisonResults([]);
    setBenchmarkResults([]);
    setShowJobForm(false);
    setNotice("New job added to the queue.");
  };

  const employeeName = (id) =>
    employees.find((employee) => employee.id === id)?.name;

  const initials = (name) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("");

  return (
    <div className="app-shell">
      <main className="main-content">
        <header className="site-header">
          <nav className="top-nav" aria-label="Main navigation">
            {availableViews.map((view) => (
              <button
                key={view}
                className={`nav-item ${activeView === view ? "active" : ""}`}
                onClick={() => setActiveView(view)}
              >
                {view}
              </button>
            ))}
          </nav>
        </header>
        <header className="topbar">
          <div>
            <p className="eyebrow">Tuesday, 4 September 2026</p>
            <h1>
              {activeView === "Overview" ? "Good morning, Alex" : activeView}
            </h1>
          </div>
          <div className="profile">
            <span className="avatar">AS</span>
            <span>
              <strong>Alex Smith</strong>
              <small>Workspace admin</small>
            </span>
          </div>
        </header>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeView === "Overview" && (
          <>
            <section className="welcome-row">
              <div>
                <h2>Your staffing overview</h2>
                <p>
                  See who is ready for work and match the next job to the right
                  person.
                </p>
              </div>
              <div className="actions">
                <button
                  className="button secondary"
                  onClick={() => setShowEmployeeForm(true)}
                >
                  Add employee
                </button>
                <button
                  className="button primary"
                  onClick={() => setShowJobForm(true)}
                >
                  Add a new job
                </button>
              </div>
            </section>
            <section className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon green">+</span>
                <div>
                  <span>Available employees</span>
                  <strong>{availableCount}</strong>
                  <small>Ready to take a job</small>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon amber">!</span>
                <div>
                  <span>Jobs waiting</span>
                  <strong>{openJobs}</strong>
                  <small>Need an assignment</small>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon blue">✓</span>
                <div>
                  <span>Assigned this week</span>
                  <strong>{assignedThisWeek}</strong>
                  <small>Across your team</small>
                </div>
              </div>
            </section>

            <section className="content-grid">
              <div className="panel jobs-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Jobs waiting for someone</h2>
                    <p>Choose a job to see the best available matches.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setActiveView("Jobs")}
                  >
                    View all
                  </button>
                </div>
                <div className="job-list">
                  {jobs
                    .filter((job) => !job.assignedTo)
                    .map((job) => (
                      <button
                        key={job.id}
                        className={`job-row ${selectedJob?.id === job.id ? "selected" : ""}`}
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <span className="job-dot"></span>
                        <span className="job-info">
                          <strong>{job.title}</strong>
                          <small>
                            {job.client} · Due {job.due}
                          </small>
                        </span>
                        <span
                          className={`priority ${job.priority.toLowerCase()}`}
                        >
                          {job.priority}
                        </span>
                        <span className="chevron">›</span>
                      </button>
                    ))}
                  {openJobs === 0 && (
                    <p className="empty-state">All jobs have been assigned.</p>
                  )}
                </div>
              </div>

              <div className="panel match-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Best match</h2>
                    <p>
                      {selectedJob
                        ? `For ${selectedJob.title}`
                        : "Select a job"}
                    </p>
                  </div>
                  <span className="match-badge">Skill match</span>
                </div>
                {selectedJob &&
                  recommendations.slice(0, 3).map((employee, index) => (
                    <div
                      className={`match-row ${index === 0 ? "top-match" : ""}`}
                      key={employee.id}
                    >
                      <span className="avatar employee-avatar">
                        {initials(employee.name)}
                      </span>
                      <span className="match-info">
                        <strong>{employee.name}</strong>
                        <small>
                          {employee.role} · {employee.location}
                        </small>
                        <span className="skill-line">
                          {employee.matchedSkills.length
                            ? `${employee.matchedSkills.length} of ${selectedJob.skills.length} skills match`
                            : "No direct skill match"}
                        </span>
                      </span>
                      {index === 0 && (
                        <button
                          className="assign-button"
                          onClick={() => assignEmployee(employee)}
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  ))}
                {selectedJob && recommendations.length === 0 && (
                  <p className="empty-state">
                    No available employees right now.
                  </p>
                )}
                <div className="skill-legend">
                  Required skills: {selectedJob?.skills.join(" · ")}
                </div>
              </div>
            </section>

            <section className="panel team-panel">
              <div className="panel-heading">
                <div>
                  <h2>Your team</h2>
                  <p>Employees are kept ready until a suitable job arrives.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setActiveView("Employees")}
                >
                  Manage team
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Skills</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id}>
                        <td>
                          <span className="table-person">
                            <span className="avatar small-avatar">
                              {initials(employee.name)}
                            </span>
                            <strong>{employee.name}</strong>
                          </span>
                        </td>
                        <td>{employee.role}</td>
                        <td>
                          <span className="skills">
                            {employee.skills.slice(0, 2).map((skill) => (
                              <span key={skill}>{skill}</span>
                            ))}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status ${employee.status === "Available" ? "available" : "busy"}`}
                          >
                            <i></i>
                            {employee.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeView === "Allocation Lab" && (
          <section className="allocation-lab">
            <div className="lab-intro">
              <div>
                <p className="eyebrow">
                  Task 2 · Intelligent Resource Allocation
                </p>
                <h2>Choose the best work plan</h2>
                <p>
                  Fit the highest-value work into a limited team capacity, then
                  compare how each algorithm performs.
                </p>
              </div>
              <div className="capacity-card">
                <span>Available capacity</span>
                <strong>{availableCapacity} hours</strong>
                <small>
                  {allocationItems.length} candidate work items from your jobs
                </small>
              </div>
            </div>
            <div className="panel lab-controls">
              <div>
                <label htmlFor="allocation-algorithm">
                  Allocation approach
                </label>
                <select
                  id="allocation-algorithm"
                  value={allocationAlgorithm}
                  onChange={(event) =>
                    setAllocationAlgorithm(event.target.value)
                  }
                >
                  {Object.entries(allocationAlgorithms).map(
                    ([value, details]) => (
                      <option key={value} value={value}>
                        {details.label}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="lab-buttons">
                <button className="button primary" onClick={runAllocation}>
                  Run selected approach
                </button>
                <button
                  className="button secondary"
                  onClick={compareAllocations}
                >
                  Compare all 3
                </button>
                <button
                  className="button secondary"
                  onClick={benchmarkAllocations}
                >
                  Run scaling test
                </button>
              </div>
            </div>
            <div className="algorithm-cards">
              <div>
                <strong>Dynamic programming</strong>
                <span>Exact result · O(n × capacity) time</span>
                <small>
                  Uses a two-dimensional numeric table and backtracking.
                </small>
              </div>
              <div>
                <strong>Greedy ratio</strong>
                <span>Fast heuristic · O(n log n) time</span>
                <small>Sorts independent work items by value per hour.</small>
              </div>
              <div>
                <strong>Genetic algorithm</strong>
                <span>Approximation · O(g × p × n) time</span>
                <small>
                  Uses chromosomes, repair, mutation, crossover, and elitism.
                </small>
              </div>
            </div>
            {allocationResult && (
              <div className="panel result-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      {allocationAlgorithms[allocationResult.algorithm].label}
                    </h2>
                    <p>
                      {allocationResult.approach} · Memory cells/entries used:{" "}
                      {allocationResult.memoryFootprint}
                    </p>
                  </div>
                  <span className="result-badge">Completed</span>
                </div>
                <div className="result-stats">
                  <div>
                    <span>Total value</span>
                    <strong>{allocationResult.totalValue}</strong>
                  </div>
                  <div>
                    <span>Capacity used</span>
                    <strong>
                      {allocationResult.totalCost} / {availableCapacity} hrs
                    </strong>
                  </div>
                  <div>
                    <span>Execution time</span>
                    <strong>
                      {allocationResult.executionTimeMs.toFixed(3)} ms
                    </strong>
                  </div>
                </div>
                <div className="selected-work">
                  <h3>Selected work</h3>
                  {allocationResult.selectedItems.map((item) => (
                    <span key={item.id}>
                      {item.name}{" "}
                      <small>
                        {item.cost} hrs · {item.value} value
                      </small>
                    </span>
                  ))}
                </div>
                {allocationResult.convergenceHistory && (
                  <div className="convergence">
                    <h3>Genetic convergence history</h3>
                    <p>Best total value found at each generation.</p>
                    <div className="sparkline">
                      {allocationResult.convergenceHistory.map(
                        (value, index) => (
                          <i
                            key={`${value}-${index}`}
                            style={{
                              height: `${Math.max(8, (value / Math.max(...allocationResult.convergenceHistory)) * 100)}%`,
                            }}
                            title={`Generation ${index + 1}: ${value}`}
                          ></i>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {comparisonResults.length > 0 && (
              <div className="panel comparison-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Algorithm comparison</h2>
                    <p>
                      Every approach received the same jobs and available
                      capacity.
                    </p>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Approach</th>
                        <th>Total value</th>
                        <th>Capacity used</th>
                        <th>Time (ms)</th>
                        <th>Optimality gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResults.map((result) => (
                        <tr key={result.algorithm}>
                          <td>
                            <strong>{result.label}</strong>
                          </td>
                          <td>{result.totalValue}</td>
                          <td>{result.totalCost} hrs</td>
                          <td>{result.executionTimeMs.toFixed(3)}</td>
                          <td>{result.optimalityGap.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="comparison-bars">
                  {comparisonResults.map((result) => (
                    <div className="bar-group" key={result.algorithm}>
                      <span>{result.label}</span>
                      <div className="bar-track">
                        <i
                          style={{
                            width: `${(result.totalValue / Math.max(...comparisonResults.map((item) => item.totalValue))) * 100}%`,
                          }}
                        ></i>
                      </div>
                      <strong>{result.totalValue}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {benchmarkResults.length > 0 && (
              <div className="panel comparison-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Scaling test</h2>
                    <p>Execution time as the number of candidate jobs grows.</p>
                  </div>
                </div>
                <div className="benchmark-grid">
                  {benchmarkResults.map((result) => (
                    <div key={result.size}>
                      <strong>{result.size}</strong>
                      <span>items</span>
                      <b>{result.executionTimeMs.toFixed(3)} ms</b>
                    </div>
                  ))}
                </div>
                <p className="method-note">
                  This evidence supports the coursework analysis of efficiency,
                  memory use, and scalability.
                </p>
              </div>
            )}
            <div className="panel item-panel">
              <div className="panel-heading">
                <div>
                  <h2>Jobs available for allocation</h2>
                  <p>
                    Value is the benefit of completing the work; cost is the
                    team time required.
                  </p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Work item</th>
                      <th>Cost (hours)</th>
                      <th>Value</th>
                      <th>Value / cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td>{item.cost}</td>
                        <td>{item.value}</td>
                        <td>{(item.value / item.cost).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeView !== "Overview" && activeView !== "Allocation Lab" && (
          <section className="panel full-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {activeView === "Employees"
                    ? "All employees"
                    : activeView === "Jobs"
                      ? "All jobs"
                      : "Reports"}
                </h2>
                <p>
                  {activeView === "Reports"
                    ? "A simple view of your current staffing activity."
                    : "Keep this list up to date so assignments stay accurate."}
                </p>
              </div>
              {activeView === "Employees" && (
                <button
                  className="button primary"
                  onClick={() => setShowEmployeeForm(true)}
                >
                  Add employee
                </button>
              )}
              {activeView === "Jobs" && (
                <button
                  className="button primary"
                  onClick={() => setShowJobForm(true)}
                >
                  Add a new job
                </button>
              )}
            </div>
            {activeView === "Reports" ? (
              <div className="report-summary">
                <strong>{assignedThisWeek}</strong>
                <span>jobs assigned this week</span>
                <strong>{availableCount}</strong>
                <span>employees ready for work</span>
                <strong>
                  {jobs.length
                    ? Math.round((assignedThisWeek / jobs.length) * 100)
                    : 0}
                  %
                </strong>
                <span>of jobs currently covered</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{activeView === "Employees" ? "Employee" : "Job"}</th>
                      <th>{activeView === "Employees" ? "Role" : "Client"}</th>
                      <th>
                        {activeView === "Employees" ? "Skills" : "Due date"}
                      </th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeView === "Employees" ? employees : jobs).map(
                      (item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.name || item.title}</strong>
                          </td>
                          <td>{item.role || item.client}</td>
                          <td>{item.skills?.join(", ") || item.due}</td>
                          <td>
                            <span
                              className={`status ${item.status === "Available" || !item.assignedTo ? "available" : "busy"}`}
                            >
                              <i></i>
                              {item.status ||
                                employeeName(item.assignedTo) ||
                                "Waiting"}
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {showEmployeeForm && (
          <div className="modal-backdrop">
            <form className="modal" onSubmit={addEmployee}>
              <div className="modal-heading">
                <h2>Add an employee</h2>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setShowEmployeeForm(false)}
                >
                  ×
                </button>
              </div>
              <p>Add the skills you want to use when matching jobs.</p>
              <label>
                Full name
                <input name="name" required placeholder="e.g. Priya Silva" />
              </label>
              <label>
                Job role
                <input name="role" required placeholder="e.g. QA Specialist" />
              </label>
              <label>
                Location
                <input name="location" required placeholder="e.g. Colombo" />
              </label>
              <label>
                Skills <small>Separate each skill with a comma</small>
                <input
                  name="skills"
                  required
                  placeholder="e.g. Testing, JavaScript"
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowEmployeeForm(false)}
                >
                  Cancel
                </button>
                <button className="button primary">Add employee</button>
              </div>
            </form>
          </div>
        )}
        {showJobForm && (
          <div className="modal-backdrop">
            <form className="modal" onSubmit={addJob}>
              <div className="modal-heading">
                <h2>Add a new job</h2>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setShowJobForm(false)}
                >
                  ×
                </button>
              </div>
              <p>
                Tell us what skills this job needs and we will suggest a match.
              </p>
              <label>
                Job name
                <input
                  name="title"
                  required
                  placeholder="e.g. Mobile app testing"
                />
              </label>
              <label>
                Client or team
                <input name="client" required placeholder="e.g. Acme Ltd." />
              </label>
              <label>
                Due date
                <input name="due" required placeholder="e.g. 30 Sep 2026" />
              </label>
              <label>
                Priority
                <select name="priority" defaultValue="Medium">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>
              <label>
                Required skills <small>Separate each skill with a comma</small>
                <input
                  name="skills"
                  required
                  placeholder="e.g. Testing, Reports"
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowJobForm(false)}
                >
                  Cancel
                </button>
                <button className="button primary">Add job</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
