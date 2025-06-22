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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of students with combined guardian details.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentWithGuardian'
 *       '500':
 *         description: Internal server error.
 */
router.get('/', async (req, res) => {
  try {
    // Correctly select all student fields (using quotes for camelCase) and guardian fields
    const result = await pool.query(
      `SELECT s.id, s."firstName", s."lastName", s."middleName", s."admissioNo", s.form, s.section, s.address, s.bloodgroup, s.genotype, s.religion, s.tribe, s.gender, s.dob, s.phone, s."studentImg", s.email, g.name as guardian_name, g.phone as guardian_phone, g.status as guardian_status, g.email as guardian_email, g.img as guardian_img
       FROM students s
       LEFT JOIN guardians g ON s.guardian_id = g.id
       ORDER BY s."lastName", s."firstName"`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
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