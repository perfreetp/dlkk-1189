import initSqlJs from 'sql.js'
import path from 'path'
import bcrypt from 'bcryptjs'

let systemDb: any = null
let SQL: any = null

export const PRACTICE_SETUP_SQL = `CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary REAL, hire_date TEXT);
INSERT INTO employees VALUES (1,'张伟','技术部',15000,'2020-03-15');
INSERT INTO employees VALUES (2,'李娜','市场部',12000,'2019-07-20');
INSERT INTO employees VALUES (3,'王强','技术部',18000,'2018-01-10');
INSERT INTO employees VALUES (4,'赵敏','人事部',13000,'2021-05-08');
INSERT INTO employees VALUES (5,'刘洋','市场部',11000,'2022-02-14');
INSERT INTO employees VALUES (6,'陈静','技术部',16000,'2019-11-30');
INSERT INTO employees VALUES (7,'杨光','人事部',14000,'2020-08-22');
CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT, manager TEXT, budget REAL);
INSERT INTO departments VALUES (1,'技术部','王强',500000);
INSERT INTO departments VALUES (2,'市场部','李娜',300000);
INSERT INTO departments VALUES (3,'人事部','赵敏',200000);`

export function getSystemDb(): any {
  return systemDb
}

export function getPracticeDb(setupSql?: string): any {
  const db = new SQL.Database()
  const sql = setupSql || PRACTICE_SETUP_SQL
  db.run(sql)
  return db
}

export function queryToArray(db: any, sql: string, params?: any[]): any[] {
  const stmt = db.prepare(sql)
  if (params && params.length > 0) {
    stmt.bind(params)
  }
  const results: any[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

export async function initDatabase(): Promise<void> {
  const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  SQL = await initSqlJs({ locateFile: () => wasmPath })
  systemDb = new SQL.Database()

  systemDb.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student','instructor')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`)
  systemDb.run(`CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, icon TEXT, sort_order INTEGER DEFAULT 0);`)
  systemDb.run(`CREATE TABLE IF NOT EXISTS knowledge_points (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, color TEXT DEFAULT '#00d2ff');`)
  systemDb.run(`CREATE TABLE IF NOT EXISTS practice_sets (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER NOT NULL, name TEXT NOT NULL, description TEXT, difficulty TEXT DEFAULT 'beginner', sort_order INTEGER DEFAULT 0);`)
  systemDb.run(`CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY AUTOINCREMENT, practice_set_id INTEGER NOT NULL, title TEXT NOT NULL, description TEXT, hint TEXT, reference_sql TEXT, reference_result_json TEXT, setup_sql TEXT, database_id INTEGER DEFAULT 1, difficulty TEXT DEFAULT 'beginner', sort_order INTEGER DEFAULT 0);`)
  systemDb.run(`CREATE TABLE IF NOT EXISTS question_knowledge_points (question_id INTEGER NOT NULL, knowledge_point_id INTEGER NOT NULL, PRIMARY KEY (question_id, knowledge_point_id));`)
  systemDb.run(`CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, question_id INTEGER NOT NULL, sql_text TEXT NOT NULL, result_json TEXT, is_correct BOOLEAN DEFAULT 0, score INTEGER DEFAULT 0, instructor_comment TEXT, duration_ms INTEGER DEFAULT 0, submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP);`)
  systemDb.run(`CREATE TABLE IF NOT EXISTS mistakes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, question_id INTEGER NOT NULL, submission_id INTEGER, error_type TEXT, retry_count INTEGER DEFAULT 0, is_resolved BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`)
  systemDb.run(`CREATE TABLE IF NOT EXISTS bookmarks (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, question_id INTEGER, sql_text TEXT NOT NULL, note TEXT, tags_json TEXT DEFAULT '[]', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`)
  systemDb.run(`CREATE TABLE IF NOT EXISTS user_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, practice_set_id INTEGER NOT NULL, completed_count INTEGER DEFAULT 0, total_count INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, practice_set_id));`)

  await seedData()
}

async function seedData(): Promise<void> {
  const userCount = queryToArray(systemDb, 'SELECT COUNT(*) as cnt FROM users')
  if (userCount[0].cnt > 0) return

  const instructorHash = await bcrypt.hash('123456', 10)
  const studentHash = await bcrypt.hash('123456', 10)
  systemDb.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['instructor', instructorHash, 'instructor'])
  systemDb.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['student', studentHash, 'student'])

  systemDb.run("INSERT INTO courses (id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)", [1, 'SQL基础查询', '学习SQL查询的基础知识，包括SELECT、WHERE、ORDER BY等', '📖', 1])
  systemDb.run("INSERT INTO courses (id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)", [2, '高级SQL', '学习高级SQL技术，包括JOIN、子查询、聚合函数等', '🚀', 2])

  systemDb.run("INSERT INTO knowledge_points (id, name, category, color) VALUES (?, ?, ?, ?)", [1, 'SELECT基础', '基础', '#00d2ff'])
  systemDb.run("INSERT INTO knowledge_points (id, name, category, color) VALUES (?, ?, ?, ?)", [2, 'WHERE条件', '基础', '#7c3aed'])
  systemDb.run("INSERT INTO knowledge_points (id, name, category, color) VALUES (?, ?, ?, ?)", [3, 'JOIN连接', '高级', '#f59e0b'])
  systemDb.run("INSERT INTO knowledge_points (id, name, category, color) VALUES (?, ?, ?, ?)", [4, 'GROUP BY聚合', '高级', '#10b981'])
  systemDb.run("INSERT INTO knowledge_points (id, name, category, color) VALUES (?, ?, ?, ?)", [5, '子查询', '高级', '#ef4444'])

  systemDb.run("INSERT INTO practice_sets (id, course_id, name, description, difficulty, sort_order) VALUES (?, ?, ?, ?, ?, ?)", [1, 1, 'SELECT基础练习', '练习基本的SELECT查询语句', 'beginner', 1])
  systemDb.run("INSERT INTO practice_sets (id, course_id, name, description, difficulty, sort_order) VALUES (?, ?, ?, ?, ?, ?)", [2, 1, 'WHERE条件练习', '练习使用WHERE子句进行条件筛选', 'beginner', 2])
  systemDb.run("INSERT INTO practice_sets (id, course_id, name, description, difficulty, sort_order) VALUES (?, ?, ?, ?, ?, ?)", [3, 2, '聚合与分组练习', '练习GROUP BY和聚合函数', 'intermediate', 1])
  systemDb.run("INSERT INTO practice_sets (id, course_id, name, description, difficulty, sort_order) VALUES (?, ?, ?, ?, ?, ?)", [4, 2, '子查询与高级查询', '练习子查询和复杂查询', 'advanced', 2])

  const questions = [
    { id: 1, psId: 1, title: '查询所有员工姓名和部门', desc: '请编写SQL查询所有员工的姓名和部门', hint: '使用SELECT语句选择name和department列', refSql: 'SELECT name, department FROM employees', refJson: JSON.stringify([{"name":"张伟","department":"技术部"},{"name":"李娜","department":"市场部"},{"name":"王强","department":"技术部"},{"name":"赵敏","department":"人事部"},{"name":"刘洋","department":"市场部"},{"name":"陈静","department":"技术部"},{"name":"杨光","department":"人事部"}]), diff: 'beginner', sort: 1 },
    { id: 2, psId: 1, title: '查询技术部所有员工', desc: '请编写SQL查询技术部所有员工的信息', hint: "在WHERE子句中使用department = '技术部'", refSql: "SELECT * FROM employees WHERE department = '技术部'", refJson: JSON.stringify([{"id":1,"name":"张伟","department":"技术部","salary":15000,"hire_date":"2020-03-15"},{"id":3,"name":"王强","department":"技术部","salary":18000,"hire_date":"2018-01-10"},{"id":6,"name":"陈静","department":"技术部","salary":16000,"hire_date":"2019-11-30"}]), diff: 'beginner', sort: 2 },
    { id: 3, psId: 2, title: '查询技术部薪资大于15000的员工', desc: '请编写SQL查询技术部中薪资大于15000的员工姓名和薪资', hint: '使用WHERE子句组合多个条件，用AND连接', refSql: "SELECT name, salary FROM employees WHERE department = '技术部' AND salary > 15000", refJson: JSON.stringify([{"name":"王强","salary":18000},{"name":"陈静","salary":16000}]), diff: 'beginner', sort: 1 },
    { id: 4, psId: 2, title: '查询2020年及之后入职的员工', desc: '请编写SQL查询2020年1月1日及之后入职的员工信息', hint: "使用日期比较：hire_date >= '2020-01-01'", refSql: "SELECT * FROM employees WHERE hire_date >= '2020-01-01'", refJson: JSON.stringify([{"id":1,"name":"张伟","department":"技术部","salary":15000,"hire_date":"2020-03-15"},{"id":4,"name":"赵敏","department":"人事部","salary":13000,"hire_date":"2021-05-08"},{"id":5,"name":"刘洋","department":"市场部","salary":11000,"hire_date":"2022-02-14"},{"id":7,"name":"杨光","department":"人事部","salary":14000,"hire_date":"2020-08-22"}]), diff: 'beginner', sort: 2 },
    { id: 5, psId: 3, title: '查询每个部门的平均薪资', desc: '请编写SQL查询每个部门的平均薪资，按部门分组', hint: '使用GROUP BY和AVG函数', refSql: 'SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department', refJson: JSON.stringify([{"department":"技术部","avg_salary":16333.333333333334},{"department":"市场部","avg_salary":11500},{"department":"人事部","avg_salary":13500}]), diff: 'intermediate', sort: 1 },
    { id: 6, psId: 3, title: '查询薪资最高的3名员工', desc: '请编写SQL查询薪资最高的3名员工的姓名和薪资', hint: '使用ORDER BY降序排列，配合LIMIT', refSql: 'SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 3', refJson: JSON.stringify([{"name":"王强","salary":18000},{"name":"陈静","salary":16000},{"name":"张伟","salary":15000}]), diff: 'intermediate', sort: 2 },
    { id: 7, psId: 3, title: '查询员工数大于2的部门', desc: '请编写SQL查询员工数量大于2人的部门名称和员工数', hint: '使用GROUP BY和HAVING子句', refSql: 'SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department HAVING COUNT(*) > 2', refJson: JSON.stringify([{"department":"技术部","employee_count":3}]), diff: 'intermediate', sort: 3 },
    { id: 8, psId: 4, title: '查询比平均薪资高的员工', desc: '请编写SQL查询薪资高于所有员工平均薪资的员工姓名和薪资', hint: '在WHERE子句中使用子查询计算平均薪资', refSql: 'SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees)', refJson: JSON.stringify([{"name":"张伟","salary":15000},{"name":"王强","salary":18000},{"name":"陈静","salary":16000},{"name":"杨光","salary":14000}]), diff: 'advanced', sort: 1 },
    { id: 9, psId: 4, title: '查询每个部门薪资最高的员工', desc: '请编写SQL查询每个部门中薪资最高的员工姓名、部门和薪资', hint: '使用子查询找每个部门的最高薪资，再关联主表', refSql: "SELECT e.name, e.department, e.salary FROM employees e WHERE e.salary = (SELECT MAX(salary) FROM employees WHERE department = e.department)", refJson: JSON.stringify([{"name":"王强","department":"技术部","salary":18000},{"name":"李娜","department":"市场部","salary":12000},{"name":"杨光","department":"人事部","salary":14000}]), diff: 'advanced', sort: 2 },
    { id: 10, psId: 4, title: '查询没有员工的部门', desc: '请编写SQL查询departments表中没有对应员工的部门', hint: '使用NOT EXISTS或LEFT JOIN配合IS NULL', refSql: 'SELECT d.name FROM departments d WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.department = d.name)', refJson: JSON.stringify([]), diff: 'advanced', sort: 3 },
    { id: 11, psId: 2, title: "查询姓名包含'王'的员工", desc: "请编写SQL查询姓名中包含'王'字的员工信息", hint: '使用LIKE和%通配符', refSql: "SELECT * FROM employees WHERE name LIKE '%王%'", refJson: JSON.stringify([{"id":3,"name":"王强","department":"技术部","salary":18000,"hire_date":"2018-01-10"}]), diff: 'beginner', sort: 3 },
    { id: 12, psId: 3, title: '查询各部门薪资总和及员工数', desc: '请编写SQL查询每个部门的薪资总和和员工数量', hint: '使用GROUP BY配合SUM和COUNT函数', refSql: 'SELECT department, SUM(salary) as total_salary, COUNT(*) as employee_count FROM employees GROUP BY department', refJson: JSON.stringify([{"department":"技术部","total_salary":49000,"employee_count":3},{"department":"市场部","total_salary":23000,"employee_count":2},{"department":"人事部","total_salary":27000,"employee_count":2}]), diff: 'intermediate', sort: 4 },
  ]

  for (const q of questions) {
    systemDb.run(
      'INSERT INTO questions (id, practice_set_id, title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [q.id, q.psId, q.title, q.desc, q.hint, q.refSql, q.refJson, PRACTICE_SETUP_SQL, q.diff, q.sort]
    )
  }

  const qkp = [
    [1, 1], [2, 1], [2, 2], [3, 2], [4, 2],
    [5, 4], [6, 4], [7, 4],
    [8, 5], [9, 5], [9, 3], [10, 5], [10, 3],
    [11, 2], [12, 4],
  ]
  for (const [qid, kpid] of qkp) {
    systemDb.run('INSERT INTO question_knowledge_points (question_id, knowledge_point_id) VALUES (?, ?)', [qid, kpid])
  }
}
