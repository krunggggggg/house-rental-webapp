const Tenant = require("../models/Tenant");
const pool = require("../config/db");

exports.createTenant = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO tenants (
        tenant_id, 
        full_name, 
        contact_number, 
        email, 
        monthly_rent, 
        due_date, 
        number_of_occupants, 
        contract_start_date
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.body.full_name,
        req.body.contact_number,
        req.body.email,
        req.body.monthly_rent,
        req.body.due_date,
        req.body.number_of_occupants,
        req.body.contract_start_date,
      ]
    );
    res
      .status(201)
      .json({ message: "Tenant created successfully", tenant: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllTenants = async (req, res) => {
  try {
    const { search, active, sortBy, sortOrder } = req.query;
    let query = `SELECT * FROM tenants`;
    let conditions = [];
    let values = [];

    // ✅ Search filter (case-insensitive match using ILIKE)
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`full_name ILIKE $${values.length}`);
    }

    // ✅ Active status filter (convert "true"/"false" string to boolean)
    if (active !== undefined) {
      values.push(active === "true");
      conditions.push(`is_active = $${values.length}`);
    }

    // ✅ Add WHERE clause if conditions exist
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    // ✅ Allow only certain columns for sorting to prevent SQL injection
    const allowedSortFields = ["full_name", "created_at", "is_active"];
    if (sortBy && allowedSortFields.includes(sortBy)) {
      const sortDirection = sortOrder === "desc" ? "DESC" : "ASC";
      query += ` ORDER BY ${sortBy} ${sortDirection}`;
    }

    // ✅ Execute query safely
    const { rows } = await pool.query(query, values);
    res.json({ tenants: rows });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
};

// exports.getAllTenants = async (req, res) => {
//   try {
//     const { rows } = await pool.query(
//       "SELECT * FROM tenants ORDER BY created_at DESC"
//     );
//     res.status(200).json({ tenants: rows });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

exports.getTenantById = async (req, res) => {
  const { id } = req.params;
  console.log("Requested Tenant ID:", id);

  try {
    const { rows } = await pool.query(
      "SELECT * FROM tenants WHERE tenant_id = $1",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    res.status(200).json({ tenant: rows[0] }); // Return single tenant, not array
  } catch (error) {
    console.error("Error fetching tenant:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTenant = async (req, res) => {
  console.log(req.params.id);
  try {
    await pool.query("DELETE FROM tenants WHERE tenant_id = $1", [
      req.params.id,
    ]);
    res.json({ message: "Tenant deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateTenant = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE tenants SET 
        full_name = $1, 
        contact_number = $2, 
        email = $3, 
        monthly_rent = $4, 
        due_date = $5, 
        number_of_occupants = $6, 
        contract_start_date = $7 
      WHERE tenant_id = $8 RETURNING *`,
      [
        req.body.full_name,
        req.body.contact_number,
        req.body.email,
        req.body.monthly_rent,
        req.body.due_date,
        req.body.number_of_occupants,
        req.body.contract_start_date,
        req.params.id,
      ]
    );
    res.json({ message: "Tenant updated successfully", tenant: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDueTenants = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM tenants 
      WHERE 
        is_active = TRUE AND
        due_date BETWEEN EXTRACT(DAY FROM CURRENT_DATE) 
        AND EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '3 days')
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
