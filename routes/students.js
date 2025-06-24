const express = require('express');
const router = express.Router();
const pool = require('../db');
const { updateStudentSchema } = require('../validation/student');

/**
 * @swagger
 * /students:
 *   get:
 *     tags: [Students]
 *     summary: Get all students with their guardian information
 *     description: Retrieves a paginated list of students with search and sorting capabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: The page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: The number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter students by firstName, lastName, or email
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [lastName, firstName, email, form, admissioNo]
 *           default: lastName
 *         description: Field to sort the results by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       '200':
 *         description: Successfully retrieved students list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Students retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     students:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StudentWithGuardian'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalStudents:
 *                           type: integer
 *                           description: Total number of students matching the search criteria
 *                         totalPages:
 *                           type: integer
 *                           description: Total number of pages available
 *                         currentPage:
 *                           type: integer
 *                           description: Current page number
 *                         limit:
 *                           type: integer
 *                           description: Number of items per page
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 data:
 *                   type: null
 */
router.get('/', async (req, res) => {
  const { page = 1, limit = 10, search = '', sortBy = 'lastName', sortOrder = 'asc' } = req.query;

  try {
    const offset = (page - 1) * limit;
    const searchPattern = `%${search}%`;

    // Base query
    let query = `
      SELECT s.id, s."firstName", s."lastName", s."middleName", s."admissioNo", s.form, s.section, s.address, s.bloodgroup, s.genotype, s.religion, s.tribe, s.gender, s.dob, s.phone, s."studentImg", s.email, g.name as guardian_name, g.phone as guardian_phone, g.status as guardian_status, g.email as guardian_email, g.img as guardian_img
      FROM students s
      LEFT JOIN guardians g ON s.guardian_id = g.id
    `;
    const queryParams = [];

    // Search functionality
    if (search) {
      query += ` WHERE s."firstName" ILIKE $${queryParams.length + 1} OR s."lastName" ILIKE $${queryParams.length + 1} OR s.email ILIKE $${queryParams.length + 1}`;
      queryParams.push(searchPattern);
    }
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM (${query}) as total`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalStudents = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalStudents / limit);

    // Sorting functionality
    const validSortColumns = ['lastName', 'firstName', 'email', 'form', 'admissioNo'];
    const orderByColumn = validSortColumns.includes(sortBy) ? `s."${sortBy}"` : 's."lastName"';
    const orderDirection = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${orderByColumn} ${orderDirection}`;

    // Pagination
    queryParams.push(limit, offset);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
    
    // Execute the main query
    const result = await pool.query(query, queryParams);

    res.json({
      ok: true,
      message: 'Students retrieved successfully',
      data: {
        students: result.rows,
        pagination: {
          totalStudents,
          totalPages,
          currentPage: parseInt(page, 10),
          limit: parseInt(limit, 10)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      ok: false,
      message: 'Internal server error',
      data: null
    });
  }
});

/**
 * @swagger
 * /students/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Get a single student with guardian information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       '200':
 *         description: A single student with guardian details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentWithGuardian'
 *       '404':
 *         description: Student not found.
 *       '500':
 *         description: Internal server error.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Correctly select all student fields and join with guardians
    const result = await pool.query(
      `SELECT s.id, s."firstName", s."lastName", s."middleName", s."admissioNo", s.form, s.section, s.address, s.bloodgroup, s.genotype, s.religion, s.tribe, s.gender, s.dob, s.phone, s."studentImg", s.email, g.name as guardian_name, g.phone as guardian_phone, g.status as guardian_status, g.email as guardian_email, g.img as guardian_img
       FROM students s
       LEFT JOIN guardians g ON s.guardian_id = g.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /students/{id}:
 *   put:
 *     tags: [Students]
 *     summary: Update a student's information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       $ref: '#/components/requestBodies/UpdateStudent'
 *     responses:
 *       '200':
 *         description: Student updated successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Student not found.
 *       '500':
 *         description: Internal server error.
 */
router.put('/:id', async (req, res) => {
  try {
    const { error } = updateStudentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { id } = req.params;
    const {
      firstName, lastName, middleName, admissioNo, form, section,
      address, bloodgroup, genotype, religion, tribe, gender,
      dob, phone, studentImg, email, password
    } = req.body;

    const fields = [
      { name: '"firstName"', value: firstName },
      { name: '"lastName"', value: lastName },
      { name: '"middleName"', value: middleName },
      { name: '"admissioNo"', value: admissioNo },
      { name: 'form', value: form },
      { name: 'section', value: section },
      { name: 'address', value: address },
      { name: 'bloodgroup', value: bloodgroup },
      { name: 'genotype', value: genotype },
      { name: 'religion', value: religion },
      { name: 'tribe', value: tribe },
      { name: 'gender', value: gender },
      { name: 'dob', value: dob },
      { name: 'phone', value: phone },
      { name: '"studentImg"', value: studentImg },
      { name: 'email', value: email }
    ];

    // Dynamically build the UPDATE query
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    fields.forEach(field => {
      if (field.value !== undefined) {
        setClauses.push(`${field.name} = $${paramIndex++}`);
        values.push(field.value);
      }
    });

    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      setClauses.push(`password = $${paramIndex++}`);
      values.push(hashedPassword);
    }
    
    if (setClauses.length === 0) {
        return res.status(400).json({ error: "No fields to update." });
    }

    values.push(id);
    const query = `UPDATE students SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id`;
    
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: "Student updated successfully.", id: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'This email or admission number is already in use.' });
    }
    console.error('Error updating student:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /students/{id}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete a student (and their associated guardian)
 *     description: Deletes a student record. Due to ON DELETE CASCADE, the linked guardian record is also deleted.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       '200':
 *         description: Student and guardian deleted successfully.
 *       '404':
 *         description: Student not found.
 *       '500':
 *         description: Internal server error.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student and associated guardian deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 