const pool = require("../config/db");

const getRequests = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM requests");
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getRequests };
