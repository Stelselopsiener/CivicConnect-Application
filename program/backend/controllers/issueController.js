const pool = require("../config/db");

const listIssues = async (req, res) => {
  try {
    const { status, category, page = 1, pageSize = 20 } = req.query;
    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const conditions = [];
    const params = [];
    let i = 1;

    if (status) {
      conditions.push(`i.status = $${i++}`);
      params.push(status);
    }
    if (category) {
      conditions.push(`i.category = $${i++}`);
      params.push(category);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM issues i ${where}`,
      params
    );
    const total = Number(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT i.id, i.title, i.description, i.category, i.status, i.location,
              i.upvote_count AS "upvoteCount",
              i.created_at AS "createdAt", i.updated_at AS "updatedAt",
              json_build_object('id', u.id, 'name', u.name) AS "reportedBy"
       FROM issues i
       JOIN users u ON u.id = i.reported_by
       ${where}
       ORDER BY i.created_at DESC
       LIMIT $${i++} OFFSET $${i}`,
      params
    );

    res.json({
      items: result.rows,
      total,
      page: Number(page) || 1,
      pageSize: limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const getIssue = async (req, res) => {
  try {
    const { id } = req.params;

    const issueResult = await pool.query(
      `SELECT i.id, i.title, i.description, i.category, i.status, i.location,
              i.upvote_count AS "upvoteCount",
              i.created_at AS "createdAt", i.updated_at AS "updatedAt",
              json_build_object('id', u.id, 'name', u.name) AS "reportedBy"
       FROM issues i
       JOIN users u ON u.id = i.reported_by
       WHERE i.id = $1`,
      [id]
    );

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const commentsResult = await pool.query(
      `SELECT c.id, c.body, c.created_at AS "createdAt",
              json_build_object('id', u.id, 'name', u.name) AS author
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.issue_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    const issue = { ...issueResult.rows[0], comments: commentsResult.rows };
    res.json({ issue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const createIssue = async (req, res) => {
  try {
    const { title, description, category, location } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ error: "Title, description and category are required" });
    }

    const result = await pool.query(
      `INSERT INTO issues (title, description, category, location, reported_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, category, status, location,
                 upvote_count AS "upvoteCount",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [title, description, category, location || null, req.user.id]
    );

    const issue = {
      ...result.rows[0],
      reportedBy: { id: req.user.id, name: req.user.name || "You" },
      comments: [],
    };

    // Fetch the real name
    const userResult = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
    if (userResult.rows[0]) {
      issue.reportedBy.name = userResult.rows[0].name;
    }

    res.status(201).json({ issue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const updateIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["reported", "in_review", "in_progress", "resolved"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const result = await pool.query(
      `UPDATE issues SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, description, category, status, location,
                 upvote_count AS "upvoteCount",
                 created_at AS "createdAt", updated_at AS "updatedAt", reported_by`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const row = result.rows[0];
    const userResult = await pool.query("SELECT id, name FROM users WHERE id = $1", [row.reported_by]);
    const issue = {
      ...row,
      reportedBy: userResult.rows[0] || { id: row.reported_by, name: "Unknown" },
      comments: [],
    };
    delete issue.reported_by;

    res.json({ issue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: "Comment body is required" });
    }

    // Check issue exists
    const issueCheck = await pool.query("SELECT id FROM issues WHERE id = $1", [id]);
    if (issueCheck.rows.length === 0) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const result = await pool.query(
      `INSERT INTO comments (issue_id, author_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, created_at AS "createdAt"`,
      [id, req.user.id, body.trim()]
    );

    const userResult = await pool.query("SELECT id, name FROM users WHERE id = $1", [req.user.id]);
    const comment = {
      ...result.rows[0],
      author: userResult.rows[0],
    };

    res.status(201).json({ comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const upvoteIssue = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to insert upvote (unique constraint prevents duplicates)
    try {
      await pool.query(
        "INSERT INTO issue_upvotes (issue_id, user_id) VALUES ($1, $2)",
        [id, req.user.id]
      );
      await pool.query(
        "UPDATE issues SET upvote_count = upvote_count + 1 WHERE id = $1",
        [id]
      );
    } catch (e) {
      // Already upvoted → ignore
      if (e.code !== "23505") throw e;
    }

    const result = await pool.query(
      "SELECT upvote_count AS \"upvoteCount\" FROM issues WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Issue not found" });
    }

    res.json({ upvoteCount: result.rows[0].upvoteCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  listIssues,
  getIssue,
  createIssue,
  updateIssueStatus,
  addComment,
  upvoteIssue,
};