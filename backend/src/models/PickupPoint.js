const { pool } = require('../config/database');

const mapPickupPointRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    routeId: row.route_id,
    name: row.name,
    lat: Number(row.lat),
    lng: Number(row.lng),
  };
};

class PickupPoint {
  static async findByRouteId(routeId) {
    const [rows] = await pool.query(
      'SELECT * FROM pickup_points WHERE route_id = ? ORDER BY name',
      [routeId],
    );
    return rows.map(mapPickupPointRow);
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM pickup_points WHERE id = ?', [id]);
    return rows.length ? mapPickupPointRow(rows[0]) : null;
  }

  static async findAll() {
    const [rows] = await pool.query('SELECT * FROM pickup_points ORDER BY route_id, name');
    return rows.map(mapPickupPointRow);
  }
}

module.exports = PickupPoint;

