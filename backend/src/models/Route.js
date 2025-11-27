const { pool } = require('../config/database');

const mapRouteRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    from: row.origin,
    to: row.destination,
    price: Number(row.price),
    distance: Number(row.distance_km),
    duration: `${row.duration_mins} mins`,
  };
};

class Route {
  static async findAll() {
    const [rows] = await pool.query('SELECT * FROM routes ORDER BY origin');
    return rows.map(mapRouteRow);
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM routes WHERE id = ?', [id]);
    return rows.length ? mapRouteRow(rows[0]) : null;
  }
}

module.exports = Route;

